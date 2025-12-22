const express = require('express');
const router = express.Router();
const employerController = require('../controllers/employerController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('employer'));

router.get('/profile', employerController.getProfile);
router.put('/profile', employerController.updateProfile);
router.get('/dashboard', employerController.getDashboard);

module.exports = router;

