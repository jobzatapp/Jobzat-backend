const { Candidate, CandidateProfile, Job, JobProfile, Match } = require('../models');
const aiService = require('./aiService');

/**
 * Run matching for a new job against all active candidates
 */
const matchJobToCandidates = async (jobId) => {
    try {
        const job = await Job.findByPk(jobId, {
            include: [{ model: JobProfile, as: 'profile' }]
        });

        if (!job) {
            throw new Error('Job not found');
        }

        if (!job.profile) {
            throw new Error('Job profile not found. Please ensure job is parsed first.');
        }

        // Find all candidates in the same category (or all if category is not specified)
        const whereClause = job.category ? { category: job.category } : {};

        const candidates = await Candidate.findAll({
            where: whereClause,
            include: [{ model: CandidateProfile, as: 'profile', required: true }]
        });

        const matches = [];

        for (const candidate of candidates) {
            // Skip if already matched
            const existingMatch = await Match.findOne({
                where: { job_id: jobId, candidate_id: candidate.id }
            });

            if (existingMatch) {
                continue;
            }

            // Calculate match score
            const matchResult = await aiService.calculateMatch(
                {
                    skills: candidate.profile.skills || [],
                    languages: candidate.profile.languages || [],
                    summary: candidate.profile.summary || '',
                    experience_years: candidate.experience_years
                },
                {
                    skills: job.profile.skills || [],
                    summary: job.profile.summary || '',
                    required_years: job.required_years
                }
            );

            // Create match record
            const match = await Match.create({
                job_id: jobId,
                candidate_id: candidate.id,
                match_score: matchResult.match_score,
                match_summary: matchResult.match_summary,
                status: 'pending'
            });

            matches.push(match);
        }

        return matches;
    } catch (error) {
        console.error('Error matching job to candidates:', error);
        throw error;
    }
};

/**
 * Run matching for a new candidate against all active jobs
 */
const matchCandidateToJobs = async (candidateId) => {
    try {
        const candidate = await Candidate.findByPk(candidateId, {
            include: [{ model: CandidateProfile, as: 'profile' }]
        });

        if (!candidate) {
            throw new Error('Candidate not found');
        }

        if (!candidate.profile) {
            throw new Error('Candidate profile not found. Please ensure CV is parsed first.');
        }

        // Find all jobs in the same category (or all if category is not specified)
        const whereClause = candidate.category ? { category: candidate.category } : {};

        const jobs = await Job.findAll({
            where: whereClause,
            include: [{ model: JobProfile, as: 'profile', required: true }]
        });

        const matches = [];

        for (const job of jobs) {
            // Skip if already matched
            const existingMatch = await Match.findOne({
                where: { job_id: job.id, candidate_id: candidateId }
            });

            if (existingMatch) {
                continue;
            }

            // Calculate match score
            const matchResult = await aiService.calculateMatch(
                {
                    skills: candidate.profile.skills || [],
                    languages: candidate.profile.languages || [],
                    summary: candidate.profile.summary || '',
                    experience_years: candidate.experience_years
                },
                {
                    skills: job.profile.skills || [],
                    summary: job.profile.summary || '',
                    required_years: job.required_years
                }
            );

            // Create match record
            const match = await Match.create({
                job_id: job.id,
                candidate_id: candidateId,
                match_score: matchResult.match_score,
                match_summary: matchResult.match_summary,
                status: 'pending'
            });

            matches.push(match);
        }

        return matches;
    } catch (error) {
        console.error('Error matching candidate to jobs:', error);
        throw error;
    }
};

module.exports = {
    matchJobToCandidates,
    matchCandidateToJobs
};

