const emailService = require('../services/emailService');
const { Match, Job, Candidate, CandidateProfile, JobProfile, User, Employer, JobApplication } = require('../models/index');
const fileUploadService = require('../services/fileUploadService');

/**
 * Get matches for a job (for employers)
 */
const getJobMatches = async (req, res) => {
    try {
        const { jobId } = req.params;

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        // Verify job belongs to employer
        const job = await Job.findOne({
            where: { id: jobId, employer_id: user.employer.id }
        });

        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }

        // Get matches sorted by score
        const matches = await Match.findAll({
            where: { job_id: jobId },
            include: [
                {
                    model: Candidate,
                    as: 'candidate',
                    include: [{ model: CandidateProfile, as: 'profile' }]
                }
            ],
            order: [['match_score', 'DESC']]
        });

        // Format response
        const formattedMatches = matches.map(match => ({
            id: match.id,
            candidate: {
                id: match.candidate.id,
                name: match.candidate.name,
                experience_years: match.candidate.experience_years,
                category: match.candidate.category,
                top_skills: match.candidate.profile?.skills?.slice(0, 5) || [],
                cv_url: match.candidate.cv_url ? fileUploadService.getFileUrl(match.candidate.cv_url) : null,
                video_url: match.candidate.video_url ? fileUploadService.getFileUrl(match.candidate.video_url) : null
            },
            match_score: match.match_score,
            match_summary: match.match_summary,
            status: match.status,
            created_at: match.created_at
        }));

        res.json({ matches: formattedMatches });
    } catch (error) {
        console.error('Get job matches error:', error);
        res.status(500).json({ error: 'Failed to get job matches' });
    }
};

/**
 * Reject a candidate match
 */
const rejectMatch = async (req, res) => {
    try {
        const { matchId } = req.params;

        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const match = await Match.findByPk(matchId, {
            include: [
                {
                    model: Job,
                    as: 'job',
                    where: { employer_id: user.employer.id }
                }
            ]
        });

        if (!match) {
            return res.status(404).json({ error: 'Match not found' });
        }

        await match.update({ status: 'rejected' });

        res.json({ message: 'Candidate rejected successfully', match });
    } catch (error) {
        console.error('Reject match error:', error);
        res.status(500).json({ error: 'Failed to reject candidate' });
    }
};

/**
 * Shortlist a candidate match
 */
const shortlistMatch = async (req, res) => {
    try {
        const { matchId } = req.params;

        // Get employer user
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Employer, as: 'employer' }]
        });

        if (!user?.employer) {
            return res.status(404).json({ error: 'Employer profile not found' });
        }

        const match = await Match.findByPk(matchId, {
            include: [
                {
                    model: Job,
                    as: 'job',
                    where: { employer_id: user.employer.id },
                    include: [{
                        model: Employer,
                        as: 'employer',
                        attributes: ['id', 'company_name']
                    }]
                },
                {
                    model: Candidate,
                    as: 'candidate',
                    attributes: ['id', 'name', 'user_id'],
                    include: [{
                        model: User,
                        as: 'user',
                        attributes: ['id', 'email']
                    }]
                }
            ]
        });

        if (!match) {
            return res.status(404).json({ error: 'Match not found or unauthorized' });
        }

        // Check if match is already shortlisted
        if (match.status === 'shortlisted') {
            return res.status(400).json({
                error: 'Candidate is already shortlisted',
                match
            });
        }

        // Update match status
        await match.update({
            status: 'shortlisted',
            updated_at: new Date()
        });

        // Send notification email to candidate
        let emailSent = false;
        try {
            if (!match.candidate?.user) {
                throw new Error('Candidate user information not found');
            }

            const candidateUser = match.candidate.user;
            const userLanguage = candidateUser.language || 'en';

            await emailService.sendShortlistNotification(
                candidateUser.email,
                match.candidate.name,
                match.job.title,
                match.job.employer.company_name,
                userLanguage
            );

            emailSent = true;
            console.log(`Shortlist email sent to ${candidateUser.email} in ${userLanguage}`);
        } catch (emailError) {
            console.error('Error sending shortlist notification email:', emailError);
            // Log but don't fail the request if email fails
        }

        res.json({
            message: emailSent
                ? 'Candidate shortlisted successfully. Notification email sent.'
                : 'Candidate shortlisted successfully. Email notification failed.',
            emailSent,
            match: {
                id: match.id,
                job_id: match.job_id,
                candidate_id: match.candidate_id,
                match_score: match.match_score,
                status: match.status,
                candidate: {
                    id: match.candidate.id,
                    name: match.candidate.name,
                    email: match.candidate.user.email
                },
                job: {
                    id: match.job.id,
                    title: match.job.title,
                    company: match.job.employer.company_name
                }
            }
        });
    } catch (error) {
        console.error('Shortlist match error:', error);
        res.status(500).json({
            error: 'Failed to shortlist candidate',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};


/**
 * Get matches for a candidate (for candidates to see their matches)
 */
const getCandidateMatches = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });

        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }

        const matches = await Match.findAll({
            where: { candidate_id: user.candidate.id },
            include: [
                {
                    model: Job,
                    as: 'job',
                    include: [
                        { model: Employer, as: 'employer' },
                        { model: JobProfile, as: 'profile' }
                    ]
                }
            ],
            order: [['match_score', 'DESC']]
        });

        const formattedMatches = matches.map(match => ({
            id: match.id,
            job: {
                id: match.job.id,
                title: match.job.title,
                company_name: match.job.employer.company_name,
                category: match.job.category,
                summary: match.job.profile?.summary || null
            },
            match_score: match.match_score,
            match_summary: match.match_summary,
            status: match.status,
            created_at: match.created_at
        }));

        res.json({ matches: formattedMatches });
    } catch (error) {
        console.error('Get candidate matches error:', error);
        res.status(500).json({ error: 'Failed to get candidate matches' });
    }
};

const addMatch = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Candidate, as: 'candidate' }]
        });
        if (!user.candidate) {
            return res.status(404).json({ error: 'Candidate profile not found' });
        }
        const { job_id, match_score, match_summary } = req.body;
        const match = new Match({
            job_id: job_id,
            candidate_id: user.candidate.id,
            match_score: match_score,
            match_summary: match_summary,
            status: 'pending'
        });

        await match.save();

        const jobApplication = new JobApplication({
            job_id: job_id,
            candidate_id: user.candidate.id,
            status: 'accepted',
            created_at: new Date(),
            updated_at: new Date()
        });
        await jobApplication.save();

        res.json({ message: 'Match added successfully', match, jobApplication });
    } catch (error) {
        console.error('Add match error:', error);
        res.status(500).json({ error: 'Failed to add match' });
    }
};

module.exports = {
    getJobMatches,
    rejectMatch,
    shortlistMatch,
    getCandidateMatches,
    addMatch
};

