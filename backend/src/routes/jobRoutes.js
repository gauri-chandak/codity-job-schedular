const express = require("express");

const {
    createJob,
    getJobs,
    getJob,
    retryJob,
    getJobExecutions
} = require("../controllers/jobController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createJob);

router.get("/", authMiddleware, getJobs);

router.get("/:id", authMiddleware, getJob);

router.post("/:id/retry", authMiddleware, retryJob);

router.get("/:id/executions", authMiddleware, getJobExecutions);

module.exports = router;
