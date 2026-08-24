const pool = require("../config/db");

// CREATE QUEUE
const createQueue = async (req, res) => {
    try {
        const {
            projectId,
            name,
            priority,
            concurrencyLimit,
            retryPolicyId
        } = req.body;

        if (!projectId || !name) {
            return res.status(400).json({
                message: "projectId and name are required"
            });
        }

        // Check project exists
        const [projects] = await pool.query(
            "SELECT id FROM projects WHERE id = ?",
            [projectId]
        );

        if (projects.length === 0) {
            return res.status(404).json({
                message: "Project not found"
            });
        }

        // Check retry policy
        if (retryPolicyId) {
            const [policies] = await pool.query(
                "SELECT id FROM retry_policies WHERE id = ?",
                [retryPolicyId]
            );

            if (policies.length === 0) {
                return res.status(404).json({
                    message: "Retry policy not found"
                });
            }
        }

        // If no retry policy supplied, create default one
        let finalRetryPolicyId = retryPolicyId;

        if (!finalRetryPolicyId) {
            const [policyResult] = await pool.query(
                `INSERT INTO retry_policies
                (name, strategy, max_attempts, initial_delay_seconds)
                VALUES (?, ?, ?, ?)`,
                [
                    `${name} Default Policy`,
                    "exponential",
                    3,
                    5
                ]
            );

            finalRetryPolicyId = policyResult.insertId;
        }

        const finalPriority = priority ?? 0;
        const finalConcurrency = concurrencyLimit ?? 1;

        if (finalConcurrency < 1) {
            return res.status(400).json({
                message: "Concurrency limit must be at least 1"
            });
        }

        const [result] = await pool.query(
            `INSERT INTO queues
            (
                project_id,
                retry_policy_id,
                name,
                priority,
                concurrency_limit
            )
            VALUES (?, ?, ?, ?, ?)`,
            [
                projectId,
                finalRetryPolicyId,
                name,
                finalPriority,
                finalConcurrency
            ]
        );

        res.status(201).json({
            message: "Queue created successfully",
            queue: {
                id: result.insertId,
                project_id: projectId,
                name,
                priority: finalPriority,
                concurrency_limit: finalConcurrency,
                retry_policy_id: finalRetryPolicyId,
                is_paused: false
            }
        });

    } catch (error) {
        console.error("Create queue error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET QUEUES
const getQueues = async (req, res) => {
    try {
        const { projectId } = req.query;

        let query = `
            SELECT
                q.id,
                q.project_id,
                q.name,
                q.priority,
                q.concurrency_limit,
                q.is_paused,
                q.retry_policy_id,
                rp.strategy,
                rp.max_attempts,
                rp.initial_delay_seconds,
                q.created_at,
                q.updated_at
            FROM queues q
            JOIN retry_policies rp
                ON q.retry_policy_id = rp.id
        `;

        const params = [];

        if (projectId) {
            query += " WHERE q.project_id = ?";
            params.push(projectId);
        }

        query += " ORDER BY q.priority DESC, q.created_at DESC";

        const [queues] = await pool.query(query, params);

        res.json({
            queues
        });

    } catch (error) {
        console.error("Get queues error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// GET SINGLE QUEUE
const getQueue = async (req, res) => {
    try {
        const queueId = req.params.id;

        const [queues] = await pool.query(
            `SELECT
                q.id,
                q.project_id,
                q.name,
                q.priority,
                q.concurrency_limit,
                q.is_paused,
                q.retry_policy_id,
                rp.name AS retry_policy_name,
                rp.strategy,
                rp.max_attempts,
                rp.initial_delay_seconds,
                q.created_at,
                q.updated_at
             FROM queues q
             JOIN retry_policies rp
                ON q.retry_policy_id = rp.id
             WHERE q.id = ?`,
            [queueId]
        );

        if (queues.length === 0) {
            return res.status(404).json({
                message: "Queue not found"
            });
        }

        res.json({
            queue: queues[0]
        });

    } catch (error) {
        console.error("Get queue error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// UPDATE QUEUE
const updateQueue = async (req, res) => {
    try {
        const queueId = req.params.id;

        const {
            name,
            priority,
            concurrencyLimit
        } = req.body;

        const [queues] = await pool.query(
            "SELECT id FROM queues WHERE id = ?",
            [queueId]
        );

        if (queues.length === 0) {
            return res.status(404).json({
                message: "Queue not found"
            });
        }

        if (concurrencyLimit !== undefined && concurrencyLimit < 1) {
            return res.status(400).json({
                message: "Concurrency limit must be at least 1"
            });
        }

        await pool.query(
            `UPDATE queues
             SET
                name = COALESCE(?, name),
                priority = COALESCE(?, priority),
                concurrency_limit = COALESCE(?, concurrency_limit)
             WHERE id = ?`,
            [
                name ?? null,
                priority ?? null,
                concurrencyLimit ?? null,
                queueId
            ]
        );

        res.json({
            message: "Queue updated successfully"
        });

    } catch (error) {
        console.error("Update queue error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// PAUSE QUEUE
const pauseQueue = async (req, res) => {
    try {
        const queueId = req.params.id;

        const [result] = await pool.query(
            `UPDATE queues
             SET is_paused = TRUE
             WHERE id = ?`,
            [queueId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Queue not found"
            });
        }

        res.json({
            message: "Queue paused successfully"
        });

    } catch (error) {
        console.error("Pause queue error:", error);

        res.status(500).json({
            message: "Server error"
        });
    }
};


// RESUME QUEUE
const resumeQueue = async (req, res) => {
    try {
        const queueId = req.params.id;

        const [result] = await pool.query(
            `UPDATE queues
             SET is_paused = FALSE
             WHERE id = ?`,
            [queueId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Queue not found"
            });
        }

        res.json({
            message: "Queue resumed successfully"
        });

    } catch (error) {
        console.error("Resume queue error:", error);

        res.status(500).json({
            message: "Queue resumed successfully"
        });
    }
};


module.exports = {
    createQueue,
    getQueues,
    getQueue,
    updateQueue,
    pauseQueue,
    resumeQueue
};