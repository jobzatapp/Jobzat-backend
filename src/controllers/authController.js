const { User, Candidate, Employer, CandidateProfile, CandidateEducation, CandidateExperience } = require("../models");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");
const { sendVerificationEmail } = require("../services/emailService");
const crypto = require("crypto");

/**
 * Register a new user (candidate or employer)
 */
// const register = async (req, res) => {
//     try {
//         const { email, password, role, name, city, company_name } = req.body;

//         // Validate required fields
//         if (!email || !password || !role) {
//             return res.status(400).json({ error: 'Email, password, and role are required' });
//         }

//         if (!['candidate', 'employer'].includes(role)) {
//             return res.status(400).json({ error: 'Role must be either candidate or employer' });
//         }

//         // Check if user already exists
//         const existingUser = await User.findOne({ where: { email } });
//         if (existingUser) {
//             return res.status(400).json({ error: 'User with this email already exists' });
//         }

//         // Hash password
//         const password_hash = await hashPassword(password);

//         // Create user
//         const user = await User.create({
//             email,
//             password_hash,
//             role
//         });

//         // Create role-specific profile
//         let userName = null;
//         if (role === 'candidate') {
//             if (!name) {
//                 return res.status(400).json({ error: 'Name is required for candidates' });
//             }
//             await Candidate.create({
//                 user_id: user.id,
//                 name,
//                 city: city || null
//             });
//             userName = name;
//         } else if (role === 'employer') {
//             if (!company_name) {
//                 return res.status(400).json({ error: 'Company name is required for employers' });
//             }
//             await Employer.create({
//                 user_id: user.id,
//                 company_name,
//                 city: city || null
//             });
//             userName = company_name;
//         }

//         // Generate token with user data
//         const token = generateToken({
//             id: user.id,
//             email: user.email,
//             role: user.role,
//             name: userName
//         });

//         res.status(201).json({
//             message: 'User registered successfully',
//             token,
//             user: {
//                 id: user.id,
//                 email: user.email,
//                 role: user.role
//             }
//         });
//     } catch (error) {
//         console.error('Registration error:', error);
//         res.status(500).json({ error: 'Failed to register user' });
//     }
// };
const register = async (req, res) => {
  try {
    const { email, password, country_code, mobile_number } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const password_hash = await hashPassword(password);

    const user = await User.create({
      email,
      password_hash,
      role: null,
      role_added: false,
      profile_completed: false,
      country_code: country_code || "",
      mobile_number: mobile_number || "",
    });

    // Token payload contains onboarding flags so FE can route correctly
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role, // null initially
      role_added: user.role_added,
      profile_completed: user.profile_completed,
    });

    return res.status(201).json({
      message: "Registered successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        role_added: user.role_added,
        profile_completed: user.profile_completed,
        is_verified: user.is_verified,
        mobile_number: user.mobile_number,
        country_code: user.country_code,
      },
    });
  } catch (err) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
};

/**
 * Role-assignment
 */
const PLACEHOLDER_NAME = "";

const assignRole = async (req, res) => {
  console.log("Inside the role assignment");

  try {
    const { role } = req.body;
    const user = req.user;

    if (!role || !["candidate", "employer"].includes(role)) {
      return res
        .status(400)
        .json({ error: 'Invalid role. Must be "candidate" or "employer".' });
    }

    if (user.role_added) {
      return res.status(400).json({ error: "Role already assigned." });
    }

    // Update user role and flag
    user.role = role;
    user.role_added = true;
    user.updated_at = new Date();
    await user.save();

    let createdProfile = null;

    if (role === "candidate") {
      // create minimal candidate row to satisfy DB constraints
      createdProfile = await Candidate.create({
        user_id: user.id,
        name: PLACEHOLDER_NAME,
        city: null,
        experience_years: null,
        category: null,
        salary_expectation: null,
        cv_url: null,
        video_url: null,
      });

      // Optionally create empty CandidateProfile row (not strictly required)
      await CandidateProfile.create({
        candidate_id: createdProfile.id,
        skills: [],
        languages: [],
        summary: "",
      });
    } else if (role === "employer") {
      // create minimal employer row
      createdProfile = await Employer.create({
        user_id: user.id,
        company_name: PLACEHOLDER_NAME,
        city: null,
      });
    }

    // await t.commit();

    // Re-issue token with updated claims
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      role_added: user.role_added,
      profile_completed: user.profile_completed,
      is_verified: user.is_verified,
    };
    const token = generateToken(tokenPayload);

    return res.json({
      message: "Role assigned and profile record created successfully.",
      role: user.role,
      role_added: user.role_added,
      is_verified: user.is_verified,
      profile: createdProfile,
      token,
    });
  } catch (err) {
    await t.rollback();
    console.error("assignRole error:", err);
    return res.status(500).json({ error: "Failed to assign role." });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Find user
    const user = await User.findOne({
      where: { email },
      include: [
        { model: Candidate, as: "candidate" },
        { model: Employer, as: "employer" },
      ],
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    let userName = null;
    if (user.role === "candidate") {
      userName = user?.candidate?.name || null;
    } else if (user.role === "employer") {
      userName = user?.employer?.company_name || null;
    }

    // Generate token with user data
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: userName,
      is_verified: user.is_verified,
    });

    const userData = user.toJSON();
    delete userData.password_hash;

    res.json({
      message: "Login successful",
      token,
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

/**
 * Get current user profile
 */
const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Candidate,
          as: "candidate",
          include: [
            { model: CandidateProfile, as: "profile" },
            { model: CandidateEducation, as: "educations" },
            { model: CandidateExperience, as: "experiences" },
          ],
        },
        { model: Employer, as: "employer" },
      ],
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  } catch (error) {
    console.error("Get me error:", error);
    res.status(500).json({ error: "Failed to get user profile" });
  }
};

const updatePassword = async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body;
    const user = req.user;
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!newPassword || !currentPassword) {
      return res
        .status(400)
        .json({ error: "New password and current password are required" });
    }
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password_hash
    );
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    user.password_hash = await hashPassword(newPassword);
    user.updated_at = new Date();
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
};

const requestVerification = async (req, res) => {
  try {
    const user = req.user;

    if (user.is_verified) {
      return res.status(400).json({ error: "Account already verified" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.verification_token = token;
    await user.save();

    await sendVerificationEmail(user.email, token);

    res.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("Request verification error:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    const user = await User.findOne({ where: { verification_token: token } });

    if (!user) {
      return res
        .status(400)
        .json({ error: "Invalid or expired verification token" });
    }

    user.is_verified = true;
    user.verification_token = null; // Clear token
    await user.save();

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({ error: "Failed to verify email" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    const user = req.user;
    console.log("🚀 ~ deleteAccount ~ user:", user)
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    await Candidate.destroy({ where: { user_id: user.dataValues.id } });
    await Employer.destroy({ where: { user_id: user.dataValues.id } });
    await CandidateProfile.destroy({ where: { candidate_id: user.dataValues.id } });
    await CandidateEducation.destroy({ where: { candidate_id: user.dataValues.id } });
    await CandidateExperience.destroy({ where: { candidate_id: user.dataValues.id } });
    await User.destroy({ where: { id: user.dataValues.id } });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
};

module.exports = {
  register,
  login,
  getMe,
  assignRole,
  updatePassword,
  requestVerification,
  verifyEmail,
  deleteAccount
};
