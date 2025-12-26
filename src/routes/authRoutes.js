const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authenticate, authController.getMe);
router.patch('/assign-role', authenticate, authController.assignRole);
router.patch('/update-password', authenticate, authController.updatePassword);
router.post('/request-verification', authenticate, authController.requestVerification);
router.post('/verify-email', authController.verifyEmail);
router.delete('/delete-account', authenticate, authController.deleteAccount);

module.exports = router;

