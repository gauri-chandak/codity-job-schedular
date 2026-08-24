import { useEffect, useState } from "react";
import API from "../services/api";

function Jobs() {
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchJobs = async () => {
    try {
      setLoading(true);

      const response = await API.get("/jobs");
      setJobs(response.data.jobs || []);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError("Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const openJobDetails = async (job) => {
    try {
      setSelectedJob(job);
      setDetailsLoading(true);
      setError("");

      const response = await API.get(`/jobs/${job.id}/executions`);

      setExecutions(response.data.executions || []);
    } catch (err) {
      console.error("Failed to fetch executions:", err);
      setExecutions([]);
      setError("Failed to load execution history");
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedJob(null);
    setExecutions([]);
  };

  if (loading) {
    return (
      <div className="jobs-page">
        <div className="loading-state">Loading jobs...</div>
      </div>
    );
  }

  return (
    <div className="jobs-page">

      <div className="welcome">
        <div>
          <h2>Jobs</h2>
          <p>Inspect and monitor background jobs.</p>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {!selectedJob ? (
        <div className="panel">

          <div className="panel-header">
            <div>
              <h3>Job Explorer</h3>
              <p>All jobs processed by the scheduler</p>
            </div>
          </div>

          {jobs.length === 0 ? (
            <div className="empty-state">
              No jobs available.
            </div>
          ) : (
            <div className="jobs-table-container">

              <table className="jobs-table">

                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Job</th>
                    <th>Queue</th>
                    <th>Status</th>
                    <th>Attempts</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {jobs.map((job) => (
                    <tr key={job.id}>

                      <td>#{job.id}</td>

                      <td>
                        <div className="job-name">
                          {job.name}
                        </div>

                        <div className="job-type">
                          {job.type}
                        </div>
                      </td>

                      <td>
                        {job.queue_name}
                      </td>

                      <td>
                        <span
                          className={`job-status ${job.status.toLowerCase()}`}
                        >
                          {job.status}
                        </span>
                      </td>

                      <td>
                        {job.attempts}/{job.max_attempts}
                      </td>

                      <td>
                        <button
                          className="queue-action"
                          onClick={() => openJobDetails(job)}
                        >
                          View
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>
      ) : (

        <div className="panel">

          <div className="panel-header">

            <div>
              <h3>Job #{selectedJob.id}</h3>
              <p>{selectedJob.name}</p>
            </div>

            <button
              className="queue-action"
              onClick={closeDetails}
            >
              Back to Jobs
            </button>

          </div>

          <div className="queue-details">

            <div>
              <span>Status</span>
              <strong>{selectedJob.status}</strong>
            </div>

            <div>
              <span>Queue</span>
              <strong>{selectedJob.queue_name}</strong>
            </div>

            <div>
              <span>Attempts</span>
              <strong>
                {selectedJob.attempts}/{selectedJob.max_attempts}
              </strong>
            </div>

            <div>
              <span>Type</span>
              <strong>{selectedJob.type}</strong>
            </div>

          </div>

          <div className="dashboard-section">

            <div className="section-header">
              <div>
                <h2>Execution History</h2>
                <p>Attempts made by workers</p>
              </div>
            </div>

            {detailsLoading ? (
              <div className="loading-state">
                Loading execution history...
              </div>
            ) : executions.length === 0 ? (
              <div className="empty-state">
                No execution history available.
              </div>
            ) : (

              <div className="jobs-table-container">

                <table className="jobs-table">

                  <thead>
                    <tr>
                      <th>Attempt</th>
                      <th>Status</th>
                      <th>Worker</th>
                      <th>Started</th>
                      <th>Completed</th>
                      <th>Error</th>
                    </tr>
                  </thead>

                  <tbody>

                    {executions.map((execution) => (
                      <tr key={execution.id}>

                        <td>
                          #{execution.attempt_number}
                        </td>

                        <td>
                          <span
                            className={`job-status ${execution.status.toLowerCase()}`}
                          >
                            {execution.status}
                          </span>
                        </td>

                        <td>
                          {execution.worker_id || "N/A"}
                        </td>

                        <td>
                          {execution.started_at
                            ? new Date(
                                execution.started_at
                              ).toLocaleString()
                            : "N/A"}
                        </td>

                        <td>
                          {execution.completed_at
                            ? new Date(
                                execution.completed_at
                              ).toLocaleString()
                            : "N/A"}
                        </td>

                        <td>
                          {execution.error_message || "-"}
                        </td>

                      </tr>
                    ))}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        </div>
      )}

    </div>
  );
}

export default Jobs;