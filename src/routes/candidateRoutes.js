const express = require("express");
const router = express.Router();
const candidateController = require("../controllers/candidateController");
const { authenticate, requireRole } = require("../middleware/auth");
const fileUploadService = require("../services/fileUploadService");

router.use(authenticate);
router.use(requireRole("candidate"));

router.get("/profile", candidateController.getProfile);
router.put(
  "/profile",
  fileUploadService.upload.fields([
    { name: "profile_image", maxCount: 1 },
    { name: "cv", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  fileUploadService.multerErrorHandler,
  candidateController.updateProfile
);
router.get("/matches", candidateController.getCandidateMatches);
router.post("/reject-job", candidateController.rejectJobApplication);
router.post("/create-education", candidateController.createCandidateEducation);
router.put(
  "/update-education/:id",
  candidateController.updateCandidateEducation
);
router.delete(
  "/delete-education/:id",
  candidateController.deleteCandidateEducation
);
router.post(
  "/create-experience",
  candidateController.createCandidateExperience
);
router.put(
  "/update-experience/:id",
  candidateController.updateCandidateExperience
);
router.delete(
  "/delete-experience/:id",
  candidateController.deleteCandidateExperience
);

module.exports = router;
