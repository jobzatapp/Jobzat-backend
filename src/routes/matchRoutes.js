const express = require('express');
const router = express.Router();
const matchController = require('../controllers/matchController');
const { authenticate, requireRole } = require('../middleware/auth');

// Employer routes
router.get('/job/:jobId', authenticate, requireRole('employer'), matchController.getJobMatches);
router.post('/:matchId/reject', authenticate, requireRole('employer'), matchController.rejectMatch);
router.post('/:matchId/shortlist', authenticate, requireRole('employer'), matchController.shortlistMatch);

// Candidate routes
router.get('/candidate/matches', authenticate, requireRole('candidate'), matchController.getCandidateMatches);
router.post('/add-match', authenticate, requireRole('candidate'), matchController.addMatch);

module.exports = router;

