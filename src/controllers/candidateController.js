const { Op } = require("sequelize");
const {
  Candidate,
  CandidateProfile,
  User,
  Job,
  Employer,
} = require("../models");
const JobApplication = require("../models/jobApplication");
const aiService = require("../services/aiService");
const fileUploadService = require("../services/fileUploadService");
const pdf = require("pdf-parse");
const CandidateEducation = require("../models/CandidateEducation");
const CandidateExperience = require("../models/CandidateExperience");

const parseArrayField = (val) => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val))
    return val
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean);
  if (typeof val === "string")
    return val
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  return [String(val).trim()].filter(Boolean);
};

/**
 * Get candidate profile
 */
const getProfile = async (req, res) => {
  const candidateId = req.user.id;
  try {
    const user = await User.findByPk(candidateId, {
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
      ],
    });

    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    const candidate = user.candidate;

    const cvUrl = candidate.cv_url
      ? await fileUploadService.getSignedFileUrl(candidate.cv_url, 300)
      : null;

    const videoUrl = candidate.video_url
      ? await fileUploadService.getSignedFileUrl(candidate.video_url, 300)
      : null;

    res.json({
      candidate: {
        ...candidate.toJSON(),
        cv_url: cvUrl,
        video_url: videoUrl,
      },
      profile_completed: user?.profile_completed,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ error: "Failed to get candidate profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      name,
      city,
      experience_years,
      category,
      salary_expectation,
      skills,
      languages,
      summary,
      country_code,
      mobile_number,
    } = req.body;

    const profile_image = req.files?.profile_image?.[0];
    const cv = req.files?.cv?.[0];
    const video = req.files?.video?.[0];

    const user = await User.findByPk(userId, {
      include: [
        {
          model: Candidate,
          as: "candidate",
          include: [{ model: CandidateProfile, as: "profile" }],
        },
      ],
    });

    if (!user || !user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    const candidate = user.candidate;

    /* --------------------------------------------------
       UPLOAD FILES TO S3 (PRIVATE)
    -------------------------------------------------- */

    const profileImageKey = profile_image
      ? await fileUploadService.uploadToS3(
          profile_image,
          "profile-images",
          userId
        )
      : null;

    const cvKey = cv
      ? await fileUploadService.uploadToS3(cv, "cvs", userId)
      : null;

    const videoKey = video
      ? await fileUploadService.uploadToS3(video, "videos", userId)
      : null;

    /* --------------------------------------------------
       BUILD CANDIDATE PAYLOAD
    -------------------------------------------------- */

    const skillsArr = parseArrayField(skills);
    const languagesArr = parseArrayField(languages);

    const candidatePayload = {};

    if (name !== undefined) candidatePayload.name = name;
    if (city !== undefined) candidatePayload.city = city;
    if (experience_years !== undefined)
      candidatePayload.experience_years = experience_years;
    if (category !== undefined) candidatePayload.category = category;
    if (salary_expectation !== undefined)
      candidatePayload.salary_expectation = salary_expectation;

    /* --------------------------------------------------
       HANDLE FILE REPLACEMENT (DELETE OLD S3 OBJECTS)
    -------------------------------------------------- */

    if (profileImageKey) {
      if (candidate.profile_image_key) {
        await fileUploadService.deleteFile(candidate.profile_image_key);
      }
      candidatePayload.profile_image_url = profileImageKey;
    }

    if (cvKey) {
      if (candidate.cv_key) {
        await fileUploadService.deleteFile(candidate.cv_key);
      }
      candidatePayload.cv_url = cvKey;
    }

    if (videoKey) {
      if (candidate.video_key) {
        await fileUploadService.deleteFile(candidate.video_key);
      }
      candidatePayload.video_url = videoKey;
    }

    if (Object.keys(candidatePayload).length > 0) {
      console.log("Checking here in condition ");
      candidatePayload.updated_at = new Date();
      await candidate.update(candidatePayload);
    }

    /* --------------------------------------------------
       PROFILE TABLE
    -------------------------------------------------- */

    let profile = await CandidateProfile.findOne({
      where: { candidate_id: candidate.id },
    });

    if (!profile) {
      profile = await CandidateProfile.create({
        candidate_id: candidate.id,
        skills: skillsArr ?? [],
        languages: languagesArr ?? [],
        summary: summary ?? null,
        mobile_number: mobile_number ?? null,
        country_code: country_code ?? null,
        created_at: new Date(),
        updated_at: new Date(),
      });
    } else {
      const profilePayload = {};
      if (skillsArr !== undefined) profilePayload.skills = skillsArr;
      if (languagesArr !== undefined) profilePayload.languages = languagesArr;
      if (summary !== undefined) profilePayload.summary = summary;
      if (mobile_number !== undefined)
        profilePayload.mobile_number = mobile_number;
      if (country_code !== undefined)
        profilePayload.country_code = country_code;

      if (Object.keys(profilePayload).length > 0) {
        profilePayload.updated_at = new Date();
        await profile.update(profilePayload);
      }
    }

    /* --------------------------------------------------
       USER TABLE
    -------------------------------------------------- */

    const userPayload = {};
    if (country_code !== undefined) userPayload.country_code = country_code;
    if (mobile_number !== undefined) userPayload.mobile_number = mobile_number;

    if (Object.keys(userPayload).length > 0) {
      userPayload.updated_at = new Date();
      await user.update(userPayload);
    }

    /* --------------------------------------------------
       PROFILE COMPLETION CHECK
    -------------------------------------------------- */

    await candidate.reload();

    const isProfileCompleted =
      Boolean(candidate.name) &&
      Boolean(candidate.city) &&
      Number.isInteger(candidate.experience_years) &&
      Boolean(candidate.category);

    if (user.profile_completed !== isProfileCompleted) {
      await user.update({
        profile_completed: isProfileCompleted,
        updated_at: new Date(),
      });
    }

    /* --------------------------------------------------
       RESPONSE WITH SIGNED URLS
    -------------------------------------------------- */

    const updatedCandidate = await Candidate.findByPk(candidate.id, {
      include: [{ model: CandidateProfile, as: "profile" }],
    });

    return res.json({
      message: "Profile updated successfully",
      profile_completed: isProfileCompleted,
      candidate: {
        ...updatedCandidate.toJSON(),
        profile_image_url: await fileUploadService.getSignedFileUrl(
          updatedCandidate.profile_image_url
        ),
        cv_url: await fileUploadService.getSignedFileUrl(
          updatedCandidate.cv_url
        ),
        video_url: await fileUploadService.getSignedFileUrl(
          updatedCandidate.video_url
        ),
        country_code: user.country_code,
        mobile_number: user.mobile_number,
      },
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({
      error: "Failed to update profile",
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

module.exports = { updateProfile };

const getCandidateMatches = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });

    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    const jobApplications = await JobApplication.findAll({
      where: { candidate_id: user.candidate.id },
    });

    const whereClause = {
      category: user.candidate.category,
      id: {
        [Op.notIn]:
          jobApplications.map((jobApplication) => jobApplication.job_id) || [],
      },
    };

    const jobs = await Job.findAll({
      where: whereClause,
      include: [{ model: Employer, as: "employer" }],
    });

    return res.json({ jobs: jobs });
  } catch (error) {
    console.error("Reject job application error:", error);
    res.status(500).json({ error: "Failed to reject job application" });
  }
};

const rejectJobApplication = async (req, res) => {
  try {
    const { job_id } = req.body;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }

    const rejected = new JobApplication({
      job_id: job_id,
      candidate_id: user.candidate.id,
      status: "rejected",
      created_at: new Date(),
      updated_at: new Date(),
    });

    await rejected.save();

    return res.json({
      message: "Job application rejected successfully",
      rejected,
    });
  } catch (error) {
    console.error("Reject job application error:", error);
    res.status(500).json({ error: "Failed to reject job application" });
  }
};

const createCandidateEducation = async (req, res) => {
  try {
    const { school_name, degree, start_date, end_date, location } = req.body;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const education = new CandidateEducation({
      school_name: school_name,
      degree: degree,
      start_date: start_date,
      end_date: end_date,
      location: location,
      candidate_id: user.candidate.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await education.save();
    return res.json({
      message: "Candidate education created successfully",
      education,
    });
  } catch (error) {
    console.error("Create candidate education error:", error);
    res.status(500).json({ error: "Failed to create candidate education" });
  }
};

const updateCandidateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const { school_name, degree, start_date, end_date, location } = req.body;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const education = await CandidateEducation.findByPk(id);
    if (!education) {
      return res.status(404).json({ error: "Candidate education not found" });
    }
    await education.update({
      school_name: school_name,
      degree: degree,
      start_date: start_date,
      end_date: end_date,
      location: location,
      updated_at: new Date(),
    });
    return res.json({
      message: "Candidate education updated successfully",
      education,
    });
  } catch (error) {
    console.error("Update candidate education error:", error);
    res.status(500).json({ error: "Failed to update candidate education" });
  }
};

const deleteCandidateEducation = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Candidate,
          as: "candidate",
          include: [{ model: CandidateEducation, as: "educations" }],
        },
      ],
    });
    if (!user.candidate || user.candidate.educations.length === 0) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const education = await CandidateEducation.findByPk(id);
    if (!education) {
      return res.status(404).json({ error: "Candidate education not found" });
    }
    await education.destroy();
    return res.json({ message: "Candidate education deleted successfully" });
  } catch (error) {
    console.error("Delete candidate education error:", error);
    res.status(500).json({ error: "Failed to delete candidate education" });
  }
};

const createCandidateExperience = async (req, res) => {
  try {
    const { title, company_name, department, start_date, end_date, location } =
      req.body;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const experience = new CandidateExperience({
      title: title,
      company_name: company_name,
      department: department,
      start_date: start_date,
      end_date: end_date,
      location: location,
      candidate_id: user.candidate.id,
      created_at: new Date(),
      updated_at: new Date(),
    });
    await experience.save();
    return res.json({
      message: "Candidate experience created successfully",
      experience,
    });
  } catch (error) {
    console.error("Create candidate experience error:", error);
    res.status(500).json({ error: "Failed to create candidate experience" });
  }
};

const updateCandidateExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, company_name, department, start_date, end_date, location } =
      req.body;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const experience = await CandidateExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: "Candidate experience not found" });
    }
    await experience.update({
      title: title,
      company_name: company_name,
      department: department,
      start_date: start_date,
      end_date: end_date,
      location: location,
      updated_at: new Date(),
    });
    return res.json({
      message: "Candidate experience updated successfully",
      experience,
    });
  } catch (error) {
    console.error("Update candidate experience error:", error);
    res.status(500).json({ error: "Failed to update candidate experience" });
  }
};

const deleteCandidateExperience = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Candidate, as: "candidate" }],
    });
    if (!user.candidate) {
      return res.status(404).json({ error: "Candidate profile not found" });
    }
    const experience = await CandidateExperience.findByPk(id);
    if (!experience) {
      return res.status(404).json({ error: "Candidate experience not found" });
    }
    await experience.destroy();
    return res.json({ message: "Candidate experience deleted successfully" });
  } catch (error) {
    console.error("Delete candidate experience error:", error);
    res.status(500).json({ error: "Failed to delete candidate experience" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getCandidateMatches,
  rejectJobApplication,
  createCandidateEducation,
  updateCandidateEducation,
  deleteCandidateEducation,
  createCandidateExperience,
  updateCandidateExperience,
  deleteCandidateExperience,
};
