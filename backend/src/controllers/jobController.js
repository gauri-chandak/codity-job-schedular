const pool = require("../config/db");

// CREATE JOB
const createJob = async (req, res) => {
    try {
        const {
            queueId,
            name,
            type,
            payload,
            scheduledAt,
            priority
        } = req.body;

        // Validation
        if (!queueId || !name || !type) {
            return res.status(400).json({
                message: "queueId, name and type are required"
            });
        }

        // Check queue
        const [queues] = await pool.query(
            `SELECT
                id,
                is_paused
             FROM queues
             WHERE id = ?`,
            [queueId]
        );

        if (queues.length === 0) {
            return res.status(404).json({
                message: "Queue not found"
            });
        }

        // We allow jobs to be created even when queue is paused.
        // The worker will simply not process them while paused.

        const queue = queues[0];

        // Determine job status
        const status = scheduledAt ? "SCHEDULED" : "QUEUED";

        const [result] = await pool.query(
            `INSERT INTO jobs
            (
                queue_id,
                name,
                type,
                payload,
                status,
                priority,
                scheduled_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                queueId,
                name,
                type,
                payload ? JSON.stringify(payload) : null,
                status,
                priority ?? 0,
                scheduledAt || null
            ]
        );

        res.status(201).json({
            message: "Job created successfully",
            job: {
                id: result.insertId,
                queue_id: queueId,
                name,
                type,
                payload: payload || null,
                status,
                priority: priority ?? 0,
                scheduled_at: scheduledAt || null
            }
        });

    } catch (error) {
        console.error("Create job error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET JOBS
const getJobs = async (req, res) => {
    try {
        const {
            queueId,
            status,
            page = 1,
            limit = 10
        } = req.query;

        const pageNumber = Math.max(parseInt(page), 1);
        const limitNumber = Math.min(
            Math.max(parseInt(limit), 1),
            100
        );

        const offset = (pageNumber - 1) * limitNumber;

        let query = `
            SELECT
                j.id,
                j.queue_id,
                q.name AS queue_name,
                j.name,
                j.type,
                j.status,
                j.priority,
                j.attempts,
                j.max_attempts,
                j.scheduled_at,
                j.claimed_at,
                j.started_at,
                j.completed_at,
                j.created_at,
                j.updated_at
            FROM jobs j
            JOIN queues q
                ON j.queue_id = q.id
            WHERE 1 = 1
        `;

        const params = [];

        if (queueId) {
            query += " AND j.queue_id = ?";
            params.push(queueId);
        }

        if (status) {
            query += " AND j.status = ?";
            params.push(status);
        }

        query += `
            ORDER BY j.created_at DESC
            LIMIT ? OFFSET ?
        `;

        params.push(limitNumber, offset);

        const [jobs] = await pool.query(query, params);

        // Count total jobs
        let countQuery = `
            SELECT COUNT(*) AS total
            FROM jobs j
            WHERE 1 = 1
        `;

        const countParams = [];

        if (queueId) {
            countQuery += " AND j.queue_id = ?";
            countParams.push(queueId);
        }

        if (status) {
            countQuery += " AND j.status = ?";
            countParams.push(status);
        }

        const [countResult] = await pool.query(
            countQuery,
            countParams
        );

        const total = countResult[0].total;

        res.json({
            jobs,
            pagination: {
                page: pageNumber,
                limit: limitNumber,
                total,
                totalPages: Math.ceil(total / limitNumber)
            }
        });

    } catch (error) {
        console.error("Get jobs error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET SINGLE JOB
const getJob = async (req, res) => {
    try {
        const jobId = req.params.id;

        const [jobs] = await pool.query(
            `SELECT
                j.*,
                q.name AS queue_name
             FROM jobs j
             JOIN queues q
                ON j.queue_id = q.id
             WHERE j.id = ?`,
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        res.json({
            job: jobs[0]
        });

    } catch (error) {
        console.error("Get job error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// RETRY FAILED JOB
const retryJob = async (req, res) => {
    try {
        const jobId = req.params.id;

        const [jobs] = await pool.query(
            `SELECT
                id,
                status,
                attempts,
                max_attempts
             FROM jobs
             WHERE id = ?`,
            [jobId]
        );

        if (jobs.length === 0) {
            return res.status(404).json({
                message: "Job not found"
            });
        }

        const job = jobs[0];

        if (
            job.status !== "FAILED" &&
            job.status !== "DLQ"
        ) {
            return res.status(400).json({
                message: "Only failed or DLQ jobs can be retried"
            });
        }

        await pool.query(
            `UPDATE jobs
             SET
                status = 'QUEUED',
                next_attempt_at = NULL,
                completed_at = NULL
             WHERE id = ?`,
            [jobId]
        );

        res.json({
            message: "Job queued for retry"
        });

    } catch (error) {
        console.error("Retry job error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};

const getJobExecutions = async (req, res) => {
    try {
        const { id } = req.params;

        const [executions] = await pool.query(
            `SELECT
                je.id,
                je.job_id,
                je.attempt_number,
                je.status,
                je.worker_id,
                je.started_at,
                je.completed_at,
                je.error_message
             FROM job_executions je
             WHERE je.job_id = ?
             ORDER BY je.attempt_number ASC`,
            [id]
        );

        res.json({
            executions
        });

    } catch (error) {
        console.error("Get job executions error:", error);

        res.status(500).json({
            message: "Failed to fetch job executions"
        });
    }
};

module.exports = {
    createJob,
    getJobs,
    getJob,
    retryJob,
    getJobExecutions
};

