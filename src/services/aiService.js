const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

/**
 * Parse CV content and extract structured profile data
 */
const parseCV = async (cvText) => {
    try {
        const prompt = `Extract the following information from this CV/resume text and return it as JSON:
- skills: array of technical and professional skills
- languages: array of languages spoken
- summary: a brief 2-3 sentence professional summary

CV Text:
${cvText}

Return only valid JSON in this format:
{
  "skills": ["skill1", "skill2", ...],
  "languages": ["language1", "language2", ...],
  "summary": "brief professional summary"
}`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional CV parser. Extract structured data from CVs and return only valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Error parsing CV:', error);
        throw new Error('Failed to parse CV');
    }
};

/**
 * Parse job description and extract key information
 */
const parseJobDescription = async (jobDescription) => {
    try {
        const prompt = `Extract the following information from this job description and return it as JSON:
- skills: array of required and preferred skills mentioned
- summary: a brief 2-3 sentence summary of the job

Job Description:
${jobDescription}

Return only valid JSON in this format:
{
  "skills": ["skill1", "skill2", ...],
  "summary": "brief job summary"
}`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional job description parser. Extract structured data from job descriptions and return only valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        return JSON.parse(content);
    } catch (error) {
        console.error('Error parsing job description:', error);
        throw new Error('Failed to parse job description');
    }
};

/**
 * Calculate match score between candidate and job
 */
const calculateMatch = async (candidateProfile, jobProfile) => {
    try {
        const prompt = `You are a job matching expert. Analyze the following candidate profile and job requirements, then provide a match score from 0-100 and a one-line reasoning.

Candidate Profile:
- Skills: ${candidateProfile.skills?.join(', ') || 'Not specified'}
- Languages: ${candidateProfile.languages?.join(', ') || 'Not specified'}
- Summary: ${candidateProfile.summary || 'Not provided'}
- Experience Years: ${candidateProfile.experience_years || 'Not specified'}

Job Requirements:
- Required Skills: ${jobProfile.skills?.join(', ') || 'Not specified'}
- Summary: ${jobProfile.summary || 'Not provided'}
- Required Years: ${jobProfile.required_years || 'Not specified'}

Return only valid JSON in this format:
{
  "match_score": 85,
  "match_summary": "Strong match due to relevant experience in X and Y skills"
}`;

        const response = await openai.chat.completions.create({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a professional job matching expert. Provide accurate match scores and concise reasoning.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.3,
            response_format: { type: 'json_object' }
        });

        const content = response.choices[0].message.content;
        const result = JSON.parse(content);

        // Ensure match_score is between 0-100
        result.match_score = Math.max(0, Math.min(100, parseInt(result.match_score) || 0));

        return result;
    } catch (error) {
        console.error('Error calculating match:', error);
        throw new Error('Failed to calculate match');
    }
};

module.exports = {
    parseCV,
    parseJobDescription,
    calculateMatch
};

