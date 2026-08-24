const executeJob = async (job) => {
    console.log(
        `[EXECUTOR] Executing job ${job.id} (${job.type})`
    );

    // LOG JOB
    if (job.type === "log") {
        const message = job.payload?.message || "No message";

        console.log(
            `[JOB ${job.id}] ${message}`
        );

        return {
            success: true,
            message
        };
    }

    // SUCCESS JOB
    if (job.type === "success") {
        console.log(
            `[JOB ${job.id}] Successful job`
        );

        return {
            success: true
        };
    }

    // FAILURE JOB
    if (job.type === "failure") {
        console.log(
            `[JOB ${job.id}] Intentional failure`
        );

        throw new Error("Intentional job failure");
    }

    // DELAY JOB
    if (job.type === "delay") {
        const seconds = job.payload?.seconds || 5;

        console.log(
            `[JOB ${job.id}] Waiting ${seconds} seconds`
        );

        await new Promise(resolve =>
            setTimeout(resolve, seconds * 1000)
        );

        return {
            success: true,
            delayedSeconds: seconds
        };
    }

    throw new Error(
        `Unknown job type: ${job.type}`
    );
};

module.exports = {
    executeJob
};