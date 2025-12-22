const { Job, JobProfile, Employer, User } = require('../models');
const aiService = require('../services/aiService');
const matchingService = require('../services/matchingService');

/**
 * Create a new job
 */
const createJob = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const { title, description, category, required_years, required_skills, salary_range, requirements, work_type, location } = req.body;

        if (!title || !description) {
            return res.status(400).json({ error: 'Title and description are required' });
        }

        // Create job
        const job = await Job.create({
            employer_id: user.employer.id,
            title,
            description,
            category: category || null,
            required_years: required_years || null,
            required_skills: required_skills || [],
            salary_range: salary_range || null,
            requirements: requirements || "",
            work_type: work_type || "",
            location: location || ""
        });

        // Parse job description using AI
        try {
            const parsedData = await aiService.parseJobDescription(description);

            // Create job profile
            await JobProfile.create({
                job_id: job.id,
                skills: parsedData.skills || [],
                summary: parsedData.summary || ''
            });

            // Trigger matching with all candidates
            // await matchingService.matchJobToCandidates(job.id);

            // Reload job with profile
            await job.reload({ include: [{ model: JobProfile, as: 'profile' }] });

            res.status(201).json({
                message: 'Job created successfully',
                job: job
            });
        } catch (parseError) {
            console.error('Job parsing error:', parseError);
            // Still return success, but note that parsing failed
            res.status(201).json({
                message: 'Job created successfully, but parsing failed',
                job: job,
                warning: 'Job parsing failed. Please try again later.'
            });
        }
    } catch (error) {
        console.error('Create job error:', error);
        res.status(500).json({ error: 'Failed to create job' });
    }
};

/**
 * Get all jobs for the employer
 */
const getMyJobs = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const jobs = await Job.findAll({
            where: { employer_id: user.employer.id },
            include: [{ model: JobProfile, as: 'profile' }],
            order: [['created_at', 'DESC']]
        });

        res.json({ jobs });
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ error: 'Failed to get jobs' });
    }
};

/**
 * Get a single job by ID
 */
const getJob = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const job = await Job.findOne({
            where: { id, employer_id: user.employer.id },
            include: [{ model: JobProfile, as: 'profile' }]
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({ job });
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ error: 'Failed to get job' });
    }
};

/**
 * Update a job
 */
const updateJob = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, category, required_years, required_skills, salary_range, requirements, work_type, location } = req.body;

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const job = await Job.findOne({
            where: { id, employer_id: user.employer.id }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        await job.update({
            title: title || job.title,
            description: description || job.description,
            category: category !== undefined ? category : job.category,
            required_years: required_years !== undefined ? required_years : job.required_years,
            required_skills: required_skills || job.required_skills,
            salary_range: salary_range !== undefined ? salary_range : job.salary_range,
            requirements: requirements !== undefined ? requirements : job.requirements,
            work_type: work_type !== undefined ? work_type : job.work_type,
            location: location !== undefined ? location : job.location
        });

        // Re-parse if description changed
        if (description && description !== job.description) {
            try {
                const parsedData = await aiService.parseJobDescription(description);
                const profile = await JobProfile.findOne({ where: { job_id: job.id } });

                if (profile) {
                    await profile.update({
                        skills: parsedData.skills || [],
                        summary: parsedData.summary || ''
                    });
                } else {
                    await JobProfile.create({
                        job_id: job.id,
                        skills: parsedData.skills || [],
                        summary: parsedData.summary || ''
                    });
                }
            } catch (parseError) {
                console.error('Job re-parsing error:', parseError);
            }
        }

        await job.reload({ include: [{ model: JobProfile, as: 'profile' }] });

        res.json({ message: 'Job updated successfully', job });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).json({ error: 'Failed to update job' });
    }
};

/**
 * Delete a job
 */
const deleteJob = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const job = await Job.findOne({
            where: { id, employer_id: user.employer.id }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        await job.destroy();

        res.json({ message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        res.status(500).json({ error: 'Failed to delete job' });
    }
};

module.exports = {
    createJob,
    getMyJobs,
    getJob,
    updateJob,
    deleteJob
};

