const express = require("express");
const router = express.Router();

const authRoutes = require("./authRoutes");
const candidateRoutes = require("./candidateRoutes");
const employerRoutes = require("./employerRoutes");
const jobRoutes = require("./jobRoutes");
const matchRoutes = require("./matchRoutes");

router.use("/auth", authRoutes);
router.use("/candidates", candidateRoutes);
router.use("/employers", employerRoutes);
router.use("/jobs", jobRoutes);
router.use("/matches", matchRoutes);

module.exports = router;
