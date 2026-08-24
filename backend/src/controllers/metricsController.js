const pool = require("../config/db");

const getMetrics = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        COUNT(*) AS totalJobs,
        SUM(status = 'QUEUED') AS queued,
        SUM(status = 'SCHEDULED') AS scheduled,
        SUM(status = 'CLAIMED') AS claimed,
        SUM(status = 'RUNNING') AS running,
        SUM(status = 'COMPLETED') AS completed,
        SUM(status = 'FAILED') AS failed
      FROM jobs
    `);

    const [workerRows] = await pool.query(`
      SELECT
        COUNT(*) AS totalWorkers,
        SUM(status = 'ACTIVE') AS activeWorkers,
        SUM(status = 'OFFLINE') AS offlineWorkers
      FROM workers
    `);

    res.json({
      jobs: {
        total: Number(rows[0].totalJobs || 0),
        queued: Number(rows[0].queued || 0),
        scheduled: Number(rows[0].scheduled || 0),
        claimed: Number(rows[0].claimed || 0),
        running: Number(rows[0].running || 0),
        completed: Number(rows[0].completed || 0),
        failed: Number(rows[0].failed || 0)
      },
      workers: {
        total: Number(workerRows[0].totalWorkers || 0),
        active: Number(workerRows[0].activeWorkers || 0),
        offline: Number(workerRows[0].offlineWorkers || 0)
      }
    });

  } catch (error) {
    console.error("Metrics error:", error);

    res.status(500).json({
      message: "Failed to fetch metrics"
    });
  }
};

module.exports = {
  getMetrics
};