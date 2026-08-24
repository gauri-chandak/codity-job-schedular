const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const projectRoutes = require("./routes/projectRoutes");
const queueRoutes = require("./routes/queueRoutes");
const jobRoutes = require("./routes/jobRoutes");
const metricsRoutes = require("./routes/metricsRoutes");
const workerRoutes = require("./routes/workerRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "Codity Distributed Job Scheduler API is running"
    });
});


app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/queues", queueRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/metrics", metricsRoutes);
app.use("/api/workers", workerRoutes);

module.exports = app;