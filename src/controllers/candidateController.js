const { Op } = require('sequelize');
const { Candidate, CandidateProfile, User, Job, Employer } = require('../models');
const JobApplication = require('../models/jobApplication');
const aiService = require('../services/aiService');
const fileUploadService = require('../services/fileUploadService');
const localFileUploadService = require('../services/localFileUploadService');
const matchingService = require('../services/matchingService');
const pdf = require('pdf-parse');

/**
 * Get candidate profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Candidate,
                    as: 'candidate',
                    include: [{ model: CandidateProfile, as: 'profile' }]
                }
            ]
        });

        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }
        console.log('user', user)
        res.json({ candidate: user.candidate, profile_completed: user?.profile_completed });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get candidate profile' });
    };
}

/**
 * Update candidate profile
 */
// const updateProfile = async (req, res) => {
//     try {
//         const user = await User.findByPk(req.user.id, {
//             include: [{ model: Candidate, as: 'candidate' }]
//         });

//         if (!user.candidate) {
//             return res.status(404).json({ error: 'Candidate profile not found' });
//         }

//         const { name, city, experience_years, category, salary_expectation } = req.body;

//         await user.candidate.update({
//             name: name || user.candidate.name,
//             city: city !== undefined ? city : user.candidate.city,
//             experience_years: experience_years !== undefined ? experience_years : user.candidate.experience_years,
//             category: category || user.candidate.category,
//             salary_expectation: salary_expectation !== undefined ? salary_expectation : user.candidate.salary_expectation
//         });

//         res.json({ message: 'Profile updated successfully', candidate: user.candidate });
//     } catch (error) {
//         console.error('Update profile error:', error);
//         res.status(500).json({ error: 'Failed to update profile' });
//     }
// };
const updateProfile = async (req, res) => {
    console.log('req.files', req.files);

    try {
        // Extract files from arrays (multer creates arrays for each field)
        const profile_image = req.files?.profile_image?.[0];
        const cv = req.files?.cv?.[0];
        const video = req.files?.video?.[0];

        console.log('profile_image', profile_image);
        console.log('cv', cv);
        console.log('video', video);

        // Upload files to local storage
        const profile_image_url = profile_image
            ? await localFileUploadService.uploadToLocal(profile_image, 'profile_images')
            : null;
        const cv_url = cv
            ? await localFileUploadService.uploadToLocal(cv, 'cvs')
            : null;
        const video_url = video
            ? await localFileUploadService.uploadToLocal(video, 'videos')
            : null;

        console.log('profile_image_url', profile_image_url);
        console.log('cv_url', cv_url);
        console.log('video_url', video_url);

        const user = await User.findByPk(req.user.id, {
            include: [
                {
                    model: Candidate,
                    as: 'candidate',
                    include: [{ model: CandidateProfile, as: 'profile' }]
                }
            ]
        });

        if (!user || !user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        const candidate = user.candidate;
        const {
            name,
            city,
            experience_years,
            category,
            salary_expectation,
            skills,
            languages,
            summary
        } = req.body;

        const parseArrayField = (val) => {
            if (val === undefined || val === null) return undefined;
            if (Array.isArray(val)) return val.map(s => String(s).trim()).filter(Boolean);
            if (typeof val === 'string') {
                return val.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
            }
            return [String(val).trim()].filter(Boolean);
        };

        const skillsArr = parseArrayField(skills);
        const languagesArr = parseArrayField(languages);

        // Build candidate payload
        const candidatePayload = {};
        if (name !== undefined) candidatePayload.name = name;
        if (city !== undefined) candidatePayload.city = city;
        if (experience_years !== undefined) candidatePayload.experience_years = experience_years;
        if (category !== undefined) candidatePayload.category = category;
        if (salary_expectation !== undefined) candidatePayload.salary_expectation = salary_expectation;

        // Add file URLs to candidate payload
        if (profile_image_url) {
            // Delete old profile image if exists
            if (candidate.profile_image_url) {
                await fileUploadService.deleteFile(candidate.profile_image_url);
            }
            candidatePayload.profile_image_url = profile_image_url;
        }
        if (cv_url) {
            // Delete old CV if exists
            if (candidate.cv_url) {
                await fileUploadService.deleteFile(candidate.cv_url);
            }
            candidatePayload.cv_url = cv_url;
        }
        if (video_url) {
            // Delete old video if exists
            if (candidate.video_url) {
                await fileUploadService.deleteFile(candidate.video_url);
            }
            candidatePayload.video_url = video_url;
        }

        // Update candidate if there are changes
        if (Object.keys(candidatePayload).length > 0) {
            candidatePayload.updated_at = new Date();
            await candidate.update(candidatePayload);
        }

        // Handle profile
        let profile = await CandidateProfile.findOne({
            where: { candidate_id: candidate.id }
        });

        if (!profile) {
            const createPayload = {
                candidate_id: candidate.id,
                skills: skillsArr !== undefined ? skillsArr : [],
                languages: languagesArr !== undefined ? languagesArr : [],
                summary: summary !== undefined ? summary : null,
                created_at: new Date(),
                updated_at: new Date()
            };
            profile = await CandidateProfile.create(createPayload);
        } else {
            const profilePayload = {};
            if (skillsArr !== undefined) profilePayload.skills = skillsArr;
            if (languagesArr !== undefined) profilePayload.languages = languagesArr;
            if (summary !== undefined) profilePayload.summary = summary;

            if (Object.keys(profilePayload).length > 0) {
                profilePayload.updated_at = new Date();
                await profile.update(profilePayload);
            }
        }

        // Reload candidate with updated data
        await candidate.reload();

        // Check if profile is completed
        const isProfileCompleted =
            Boolean(candidate.name) &&
            Boolean(candidate.city) &&
            Number.isInteger(candidate.experience_years) &&
            Boolean(candidate.category);

        // Update user profile_completed flag if changed
        if (user.profile_completed !== isProfileCompleted) {
            await user.update({
                profile_completed: isProfileCompleted,
                updated_at: new Date()
            });
        }

        // Get updated candidate with profile
        const updatedCandidate = await Candidate.findByPk(candidate.id, {
            include: [{ model: CandidateProfile, as: 'profile' }]
        });

        return res.json({
            message: 'Profile updated successfully',
            profile_completed: isProfileCompleted,
            candidate: {
                ...updatedCandidate.toJSON(),
                profile_image_url: fileUploadService.getFileUrl(updatedCandidate.profile_image_url),
                cv_url: fileUploadService.getFileUrl(updatedCandidate.cv_url),
                video_url: fileUploadService.getFileUrl(updatedCandidate.video_url)
            }
        });
    } catch (error) {
        console.error('Update profile error:', error);
        return res.status(500).json({
            error: 'Failed to update profile',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};



/**
 * Upload CV and parse it
 */
const uploadCV = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CV file is required' });
        }

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });

        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        // Delete old CV from S3 if exists
        if (user.candidate.cv_url) {
            await fileUploadService.deleteFile(user.candidate.cv_url);
        }

        // Upload CV to S3
        const s3Url = await fileUploadService.uploadToS3(req.file, 'cv');
        await user.candidate.update({ cv_url: s3Url });

        // Parse CV using AI
        try {
            const pdfData = await pdf(req.file.buffer);
            const cvText = pdfData.text;

            const parsedData = await aiService.parseCV(cvText);

            // Create or update candidate profile
            let profile = await CandidateProfile.findOne({
                where: { candidate_id: user.candidate.id }
            });

            if (profile) {
                await profile.update({
                    skills: parsedData.skills || [],
                    languages: parsedData.languages || [],
                    summary: parsedData.summary || ''
                });
            } else {
                profile = await CandidateProfile.create({
                    candidate_id: user.candidate.id,
                    skills: parsedData.skills || [],
                    languages: parsedData.languages || [],
                    summary: parsedData.summary || ''
                });
            }

            // Trigger matching with all jobs
            // await matchingService.matchCandidateToJobs(user.candidate.id);

            res.json({
                message: 'CV uploaded and parsed successfully',
                candidate: user.candidate,
                profile: profile
            });
        } catch (parseError) {
            console.error('CV parsing error:', parseError);
            // Still return success, but note that parsing failed
            res.json({
                message: 'CV uploaded successfully, but parsing failed',
                candidate: user.candidate,
                warning: 'CV parsing failed. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Upload CV error:', error);
        res.status(500).json({ error: 'Failed to upload CV' });
    }
};

/**
 * Upload video intro
 */
const uploadVideo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Video file is required' });
        }

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });

        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        // Delete old video from S3 if exists
        if (user.candidate.video_url) {
            await fileUploadService.deleteFile(user.candidate.video_url);
        }

        // Upload video to S3
        const s3Url = await fileUploadService.uploadToS3(req.file, 'videos');
        await user.candidate.update({ video_url: s3Url });

        res.json({
            message: 'Video uploaded successfully',
            candidate: user.candidate
        });
    } catch (error) {
        console.error('Upload video error:', error);
        res.status(500).json({ error: 'Failed to upload video' });
    }
};


const getCandidateMatches = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });

        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        const jobApplications = await JobApplication.findAll({
            where: { candidate_id: user.candidate.id }
        });

        const whereClause = {
            category: user.candidate.category,
            id: { [Op.notIn]: jobApplications.map(jobApplication => jobApplication.job_id) || [] }
        };

        const jobs = await Job.findAll({
            where: whereClause,
            include: [{ model: Employer, as: 'employer' }]
        });

        return res.json({ jobs: jobs });
    } catch (error) {
        console.error('Get candidate matches error:', error);
        res.status(500).json({ error: 'Failed to get candidate matches' });
    }
}

const rejectJobApplication = async (req, res) => {
    try {
        const { job_id } = req.body;
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });
        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        const rejected = new JobApplication({
            job_id: job_id,
            candidate_id: user.candidate.id,
            status: 'rejected',
            created_at: new Date(),
            updated_at: new Date()
        });

        await rejected.save();

        return res.json({ message: 'Job application rejected successfully', rejected });
    } catch (error) {
        console.error('Reject job application error:', error);
        res.status(500).json({ error: 'Failed to reject job application' });
    }
}

module.exports = {
    getProfile,
    updateProfile,
    uploadCV,
    uploadVideo,
    getCandidateMatches,
    rejectJobApplication
};

