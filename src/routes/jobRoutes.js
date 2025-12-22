const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { authenticate, requireRole } = require('../middleware/auth');

router.use(authenticate);
router.use(requireRole('employer'));

router.post('/', jobController.createJob);
router.get('/', jobController.getMyJobs);
router.get('/:id', jobController.getJob);
router.put('/:id', jobController.updateJob);
router.delete('/:id', jobController.deleteJob);

module.exports = router;

