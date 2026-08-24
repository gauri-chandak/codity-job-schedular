const express = require("express");

const {
    createQueue,
    getQueues,
    getQueue,
    updateQueue,
    pauseQueue,
    resumeQueue
} = require("../controllers/queueController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, createQueue);

router.get("/", authMiddleware, getQueues);

router.get("/:id", authMiddleware, getQueue);

router.patch("/:id", authMiddleware, updateQueue);

router.patch("/:id/pause", authMiddleware, pauseQueue);

router.patch("/:id/resume", authMiddleware, resumeQueue);

module.exports = router;