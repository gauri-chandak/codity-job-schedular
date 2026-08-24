require("dotenv").config();

const mysql = require("mysql2/promise");

const { executeJob } = require("./executor");

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10
});

const WORKER_ID =
    process.env.WORKER_ID || `worker-${process.pid}`;

const POLL_INTERVAL =
    parseInt(process.env.POLL_INTERVAL) || 2000;

let isShuttingDown = false;

let workerDbId = null;


// ========================================
// REGISTER WORKER
// ========================================

const registerWorker = async () => {

    const [result] = await pool.query(
        `INSERT INTO workers
        (
            worker_id,
            status,
            hostname,
            started_at,
            last_heartbeat
        )
        VALUES (?, 'ACTIVE', ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
            status = 'ACTIVE',
            hostname = VALUES(hostname),
            last_heartbeat = NOW()`,
        [
            WORKER_ID,
            require("os").hostname()
        ]
    );

    if (result.insertId) {
        workerDbId = result.insertId;
    } else {
        const [rows] = await pool.query(
            `SELECT id
             FROM workers
             WHERE worker_id = ?`,
            [WORKER_ID]
        );

        workerDbId = rows[0].id;
    }

    console.log(
        `[WORKER] Registered as ${WORKER_ID}`
    );
};


// ========================================
// HEARTBEAT
// ========================================

const sendHeartbeat = async () => {

    if (!workerDbId) {
        return;
    }

    try {

        await pool.query(
            `UPDATE workers
             SET
                status = 'ACTIVE',
                last_heartbeat = NOW()
             WHERE id = ?`,
            [workerDbId]
        );

        await pool.query(
            `INSERT INTO worker_heartbeats
             (worker_id, heartbeat_at)
             VALUES (?, NOW())`,
            [workerDbId]
        );

    } catch (error) {

        console.error(
            "[HEARTBEAT ERROR]",
            error.message
        );
    }
};


// ========================================
// CLAIM JOB
// ========================================

const claimJob = async () => {

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();

        /*
         * Find one available job.
         *
         * FOR UPDATE locks the selected row
         * inside this transaction.
         */

        const [jobs] = await connection.query(
            `SELECT
                j.id,
                j.queue_id,
                j.name,
                j.type,
                j.payload,
                j.status,
                j.priority,
                j.attempts,
                j.max_attempts,
                q.concurrency_limit
             FROM jobs j
             JOIN queues q
                ON j.queue_id = q.id
             WHERE
                j.status IN ('QUEUED', 'SCHEDULED')
                AND q.is_paused = FALSE
                AND (
                    j.scheduled_at IS NULL
                    OR j.scheduled_at <= NOW()
                )
                AND (
                    j.next_attempt_at IS NULL
                    OR j.next_attempt_at <= NOW()
                )
             ORDER BY
                j.priority DESC,
                j.created_at ASC
             LIMIT 1
             FOR UPDATE`
        );

        if (jobs.length === 0) {

            await connection.rollback();

            connection.release();

            return null;
        }

        const job = jobs[0];

        /*
         * Claim the job.
         */

        await connection.query(
            `UPDATE jobs
             SET
                status = 'CLAIMED',
                attempts = attempts + 1,
                claimed_at = NOW()
             WHERE id = ?
             AND status IN ('QUEUED', 'SCHEDULED')`,
            [job.id]
        );

        await connection.commit();

        connection.release();

        return {
            ...job,
            attempts: job.attempts + 1
        };

    } catch (error) {

        await connection.rollback();

        connection.release();

        throw error;
    }
};


// ========================================
// EXECUTE JOB
// ========================================

const processJob = async (job) => {
  console.log(`[WORKER] Claimed job ${job.id}`);

  /*
   * Mark RUNNING
   */

  await pool.query(
    `UPDATE jobs
         SET
            status = 'RUNNING',
            started_at = NOW()
         WHERE id = ?`,
    [job.id],
  );

  /*
   * Create execution record
   */

  const [executionResult] = await pool.query(
    `INSERT INTO job_executions
        (
            job_id,
            worker_id,
            attempt_number,
            status,
            started_at
        )
        VALUES (?, ?, ?, 'RUNNING', NOW())`,
    [job.id, workerDbId, job.attempts],
  );

  const executionId = executionResult.insertId;

  const startTime = Date.now();

  try {
    /*
     * Execute actual job
     */

    const result = await executeJob({
      ...job,
      payload:
        typeof job.payload === "string" ? JSON.parse(job.payload) : job.payload,
    });

    const duration = Date.now() - startTime;

    /*
     * Mark job COMPLETED
     */

    await pool.query(
      `UPDATE jobs
             SET
                status = 'COMPLETED',
                completed_at = NOW()
             WHERE id = ?`,
      [job.id],
    );

    /*
     * Mark execution COMPLETED
     */

    await pool.query(
      `UPDATE job_executions
             SET
                status = 'COMPLETED',
                completed_at = NOW(),
                duration_ms = ?,
                result = ?
             WHERE id = ?`,
      [duration, JSON.stringify(result), executionId],
    );

    /*
     * Add log
     */

    await pool.query(
      `INSERT INTO job_logs
            (
                job_id,
                execution_id,
                level,
                message
            )
            VALUES (?, ?, 'INFO', ?)`,
      [job.id, executionId, "Job completed successfully"],
    );

    console.log(`[WORKER] Job ${job.id} COMPLETED`);
  } catch (error) {
    const duration = Date.now() - startTime;

    console.error(`[WORKER] Job ${job.id} FAILED:`, error.message);

    /*
     * Mark execution failed
     */

    await pool.query(
      `UPDATE job_executions
             SET
                status = 'FAILED',
                completed_at = NOW(),
                duration_ms = ?,
                error_message = ?
             WHERE id = ?`,
      [duration, error.message, executionId],
    );

    /*
     * Mark job failed.
     *
     * Retry system will be added
     * in the next step.
     */

    // ========================================
// HANDLE RETRY
// ========================================

const [policies] = await pool.query(
  `SELECT
      strategy,
      initial_delay_seconds,
      max_attempts
   FROM retry_policies
   WHERE id = (
       SELECT retry_policy_id
       FROM queues
       WHERE id = ?
   )`,
  [job.queue_id],
);

let strategy = "fixed";
let delaySeconds = 5;
let maxAttempts = job.max_attempts;

if (policies.length > 0) {
  strategy = policies[0].strategy || "fixed";
  delaySeconds = policies[0].initial_delay_seconds || 5;
  maxAttempts = policies[0].max_attempts || job.max_attempts;
}

// ========================================
// CHECK IF RETRY IS POSSIBLE
// ========================================

if (job.attempts < maxAttempts) {

  let retryDelay;

  if (strategy === "fixed") {

    retryDelay = delaySeconds;

  } else if (strategy === "linear") {

    retryDelay = delaySeconds * job.attempts;

  } else if (strategy === "exponential") {

    retryDelay =
      delaySeconds * Math.pow(2, job.attempts - 1);

  } else {

    retryDelay = delaySeconds;
  }

  console.log(
    `[RETRY] Job ${job.id} will retry in ${retryDelay} seconds`
  );

  await pool.query(
    `UPDATE jobs
     SET
        status = 'QUEUED',
        next_attempt_at = DATE_ADD(NOW(), INTERVAL ? SECOND)
     WHERE id = ?`,
    [retryDelay, job.id],
  );

  await pool.query(
    `INSERT INTO job_logs
    (
        job_id,
        execution_id,
        level,
        message
    )
    VALUES (?, ?, 'WARN', ?)`,
    [
      job.id,
      executionId,
      `Job failed. Retrying in ${retryDelay} seconds.`
    ],
  );

} else {

  // ========================================
  // MOVE TO DEAD LETTER QUEUE
  // ========================================

  console.log(
    `[DLQ] Job ${job.id} moved to Dead Letter Queue`
  );

  await pool.query(
    `UPDATE jobs
     SET status = 'DLQ'
     WHERE id = ?`,
    [job.id],
  );

  await pool.query(
    `INSERT INTO dead_letter_jobs
    (
        job_id,
        reason,
        failed_at
    )
    VALUES (?, ?, NOW())`,
    [job.id, error.message],
  );

  await pool.query(
    `INSERT INTO job_logs
    (
        job_id,
        execution_id,
        level,
        message
    )
    VALUES (?, ?, 'ERROR', ?)`,
    [
      job.id,
      executionId,
      "Maximum retry attempts reached. Job moved to DLQ.",
    ],
  );
}
    /*
     * Add error log
     */

    await pool.query(
      `INSERT INTO job_logs
            (
                job_id,
                execution_id,
                level,
                message
            )
            VALUES (?, ?, 'ERROR', ?)`,
      [job.id, executionId, error.message],
    );
  }
};

// ========================================
// MAIN WORKER LOOP
// ========================================

const workerLoop = async () => {
  while (!isShuttingDown) {
    try {
      const job = await claimJob();

      if (job) {
        await processJob(job);
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
      }
    } catch (error) {
      console.error("[WORKER ERROR]", error);

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
  }
};

// ========================================
// GRACEFUL SHUTDOWN
// ========================================

const shutdown = async () => {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  console.log("[WORKER] Shutting down...");

  if (workerDbId) {
    await pool.query(
      `UPDATE workers
             SET status = 'STOPPING'
             WHERE id = ?`,
      [workerDbId],
    );
  }

  await pool.end();

  console.log("[WORKER] Shutdown complete");

  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ========================================
// START WORKER
// ========================================

const startWorker = async () => {
  console.log(`[WORKER] Starting ${WORKER_ID}...`);

  await registerWorker();

  await sendHeartbeat();

  /*
   * Heartbeat every 5 seconds
   */

  setInterval(sendHeartbeat, 5000);

  /*
   * Start polling
   */

  await workerLoop();
};

startWorker().catch((error) => {
  console.error("[WORKER] Startup failed:", error);

  process.exit(1);
});