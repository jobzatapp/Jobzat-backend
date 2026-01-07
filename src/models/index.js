const sequelize = require('../config/database');
const User = require('./User');
const Candidate = require('./Candidate');
const CandidateProfile = require('./CandidateProfile');
const Employer = require('./Employer');
const Job = require('./Job');
const JobProfile = require('./JobProfile');
const Match = require('./Match');
const JobApplication = require('./jobApplication');
const CandidateEducation = require('./CandidateEducation');
const CandidateExperience = require('./CandidateExperience');

// Define associations
User.hasOne(Candidate, { foreignKey: 'user_id', as: 'candidate' });
Candidate.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasOne(Employer, { foreignKey: 'user_id', as: 'employer' });
Employer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Candidate.hasOne(CandidateProfile, { foreignKey: 'candidate_id', as: 'profile' });
CandidateProfile.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Employer.hasMany(Job, { foreignKey: 'employer_id', as: 'jobs' });
Job.belongsTo(Employer, { foreignKey: 'employer_id', as: 'employer' });

Job.hasOne(JobProfile, { foreignKey: 'job_id', as: 'profile' });
JobProfile.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Candidate.hasMany(Match, { foreignKey: 'candidate_id', as: 'matches' });
Match.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Job.hasMany(Match, { foreignKey: 'job_id', as: 'matches' });
Match.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Candidate.hasMany(JobApplication, { foreignKey: 'candidate_id', as: 'jobApplications' });
JobApplication.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Job.hasMany(JobApplication, { foreignKey: 'job_id', as: 'jobApplications' });
JobApplication.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });

Candidate.hasMany(CandidateEducation, { foreignKey: 'candidate_id', as: 'educations' });
CandidateEducation.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

Candidate.hasMany(CandidateExperience, { foreignKey: 'candidate_id', as: 'experiences' });
CandidateExperience.belongsTo(Candidate, { foreignKey: 'candidate_id', as: 'candidate' });

module.exports = {
    sequelize,
    User,
    Candidate,
    CandidateProfile,
    CandidateEducation,
    CandidateExperience,
    Employer,
    Job,
    JobProfile,
    Match,
    JobApplication
};

