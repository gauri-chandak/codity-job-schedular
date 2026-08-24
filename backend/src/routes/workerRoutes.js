const express = require("express");

const {
    getWorkers
} = require("../controllers/workerController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, getWorkers);

module.exports = router;