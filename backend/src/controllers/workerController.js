const db = require("../config/db");

// Get all workers
const getWorkers = async (req, res) => {
    try {
        const [workers] = await db.query(`
            SELECT
                id,
                worker_id,
                status,
                hostname,
                started_at,
                last_heartbeat,
                created_at
            FROM workers
            ORDER BY id DESC
        `);

        res.status(200).json({
            workers
        });

    } catch (error) {
        console.error("[WORKERS ERROR]", error);

        res.status(500).json({
            message: "Failed to fetch workers"
        });
    }
};

module.exports = {
    getWorkers
};