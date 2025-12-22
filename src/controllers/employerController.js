const { Employer, Job, User, JobProfile, Candidate, CandidateProfile } = require('../models');
const Match = require('../models/Match');
const sequelize = require('../config/database');
const { literal, Op } = require('sequelize');

/**
 * Get employer profile
 */
const getProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }
        
        const employer = user.employer.toJSON();
        employer.profile_completed = user?.profile_completed;

        res.json({ employer });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ error: 'Failed to get employer profile' });
    }
};

/**
 * Update employer profile
 */
const updateProfile = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const { company_name, city } = req.body;

        const isProfileCompleted = Boolean(company_name) && Boolean(city);

        await user.employer.update({
            company_name: company_name || user.employer.company_name,
            city: city !== undefined ? city : user.employer.city
        });
        if (user?.profile_completed !== isProfileCompleted) {
            await user.update({
                profile_completed: isProfileCompleted,
                updated_at: new Date()
            });
        }


        res.json({ message: 'Profile updated successfully', employer: user.employer });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
};

/**
 * Get employer dashboard
 */
const getDashboard = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });
        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }
        // total matchs, rejected matchs, accepted matchs, panding matchs, 

        const jobs = await Job.findAll({ where: { employer_id: user.employer.id }, include: [{ model: JobProfile, as: 'profile' }] });
        const jobIds = jobs.map(job => job.id);

        const totalMatchs = await Match.count({ where: { job_id: { [Op.in]: jobIds } } });
        const rejectedMatchs = await Match.count({ where: { job_id: { [Op.in]: jobIds }, status: 'rejected' } });
        const acceptedMatchs = await Match.count({ where: { job_id: { [Op.in]: jobIds }, status: 'shortlisted' } });
        const pandingMatchs = await Match.count({ where: { job_id: { [Op.in]: jobIds }, status: 'pending' } });

        const matches = await Match.findAll({ where: { job_id: { [Op.in]: jobIds }, status: { [Op.in]: ['pending'] } }, include: [{ model: Candidate, as: 'candidate', include: [{ model: CandidateProfile, as: 'profile' }] }] });

        res.json({ analytics: { totalMatchs, rejectedMatchs, acceptedMatchs, pandingMatchs }, jobs: jobs, matches: matches });
    } catch (error) {
        console.error('Get dashboard error:', error);
        res.status(500).json({ error: 'Failed to get dashboard' });
    }
};
module.exports = {
    getProfile,
    updateProfile,
    getDashboard
};

