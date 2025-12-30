const express = require('express');
const router = express.Router();
const candidateController = require('../controllers/candidateController');
const { authenticate, requireRole } = require('../middleware/auth');
const fileUploadService = require('../services/fileUploadService');
const localFileUploadService = require('../services/localFileUploadService');

router.use(authenticate);
router.use(requireRole('candidate'));

router.get('/profile', candidateController.getProfile);
router.put(
    '/profile',
    localFileUploadService.upload.fields([
        { name: 'profile_image', maxCount: 1 },
        { name: 'cv', maxCount: 1 },
        { name: 'video', maxCount: 1 }
    ]),
    candidateController.updateProfile
);
// router.post('/cv', fileUploadService.upload.single('cv'), candidateController.uploadCV);
// router.post('/video', fileUploadService.upload.single('video'), candidateController.uploadVideo);
router.get('/matches', candidateController.getCandidateMatches);
router.post('/reject-job', candidateController.rejectJobApplication);
router.post('/create-education', candidateController.createCandidateEducation);
router.put('/update-education/:id', candidateController.updateCandidateEducation);
router.delete('/delete-education/:id', candidateController.deleteCandidateExperience);
router.post('/create-experience', candidateController.createCandidateExperience);
router.put('/update-experience/:id', candidateController.updateCandidateExperience);
router.delete('/delete-experience/:id', candidateController.deleteCandidateExperience);

module.exports = router;

