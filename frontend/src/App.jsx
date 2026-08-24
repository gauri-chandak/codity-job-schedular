import { useEffect, useState } from "react";
import "./App.css";
import API from "./services/api";
import Jobs from "./pages/Jobs";

function App() {
  const [metrics, setMetrics] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [queues, setQueues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activePage, setActivePage] = useState("dashboard");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsResponse, jobsResponse, workersResponse, queuesResponse] =
          await Promise.all([
            API.get("/metrics"),
            API.get("/jobs"),
            API.get("/workers"),
            API.get("/queues"),
          ]);

        setMetrics(metricsResponse.data);
        setJobs(jobsResponse.data.jobs);
        setWorkers(workersResponse.data.workers);
        setQueues(queuesResponse.data.queues);
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);

        setError("Unable to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const toggleQueue = async (queue) => {
    try {
      if (queue.is_paused) {
        await API.patch(`/queues/${queue.id}/resume`);
      } else {
        await API.patch(`/queues/${queue.id}/pause`);
      }

      const response = await API.get("/queues");
      setQueues(response.data.queues);
    } catch (error) {
      console.error("Failed to update queue:", error);

      setError(error.response?.data?.message || "Failed to update queue");
    }
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">C</div>

          <div>
            <h2>Codity</h2>
            <span>Job Scheduler</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <span>▣</span>
            Dashboard
          </button>

          <a className="nav-item">
            <span>◫</span>
            Projects
          </a>

          <a className="nav-item">
            <span>≡</span>
            Queues
          </a>

          <button
            className={`nav-item ${activePage === "jobs" ? "active" : ""}`}
            onClick={() => setActivePage("jobs")}
          >
            <span>◉</span>
            Jobs
          </button>

          <a className="nav-item">
            <span>⚙</span>
            Workers
          </a>
        </nav>

        <div className="sidebar-bottom">
          <div className="system-status">
            <span className="status-dot"></span>

            <div>
              <strong>System Online</strong>
              <small>All services healthy</small>
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Monitor your job scheduling system</p>
          </div>

          <div className="user-section">
            <div className="user-avatar">U</div>

            <div>
              <strong>User</strong>
              <small>Administrator</small>
            </div>
          </div>
        </header>

        <section className="dashboard-content">
          {activePage === "jobs" ? (
    <Jobs />
  ) : (
        <div className="dashboard-home">
          <div className="welcome">
            <div>
              <h2>System Overview</h2>
              <p>Monitor jobs, queues and workers from one place.</p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon blue">J</div>

              <div>
                <span>Total Jobs</span>
                <h3>{loading ? "..." : (metrics?.jobs.total ?? 0)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon orange">Q</div>

              <div>
                <span>Queued</span>
                <h3>{loading ? "..." : (metrics?.jobs.queued ?? 0)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon green">✓</div>

              <div>
                <span>Completed</span>
                <h3>{loading ? "..." : (metrics?.jobs.completed ?? 0)}</h3>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon red">!</div>

              <div>
                <span>Failed</span>
                <h3>{loading ? "..." : (metrics?.jobs.failed ?? 0)}</h3>
              </div>
            </div>
          </div>

          <section className="dashboard-section">
            <div className="section-header">
              <div>
                <h2>Queues</h2>
                <p>Manage queue configuration and health</p>
              </div>
            </div>

            <div className="queues-grid">
              {queues.length === 0 ? (
                <div className="empty-state">No queues available.</div>
              ) : (
                queues.map((queue) => (
                  <div className="queue-card" key={queue.id}>
                    <div className="queue-card-header">
                      <div>
                        <h3>{queue.name}</h3>

                        <span className="queue-id">Queue #{queue.id}</span>
                      </div>

                      <span
                        className={
                          queue.is_paused
                            ? "queue-status paused"
                            : "queue-status active"
                        }
                      >
                        {queue.is_paused ? "PAUSED" : "ACTIVE"}
                      </span>
                    </div>

                    <div className="queue-details">
                      <div>
                        <span>Priority</span>
                        <strong>{queue.priority}</strong>
                      </div>

                      <div>
                        <span>Concurrency</span>
                        <strong>{queue.concurrency_limit}</strong>
                      </div>

                      <div>
                        <span>Retry</span>
                        <strong>{queue.strategy}</strong>
                      </div>

                      <div>
                        <span>Max Attempts</span>
                        <strong>{queue.max_attempts}</strong>
                      </div>
                    </div>

                    <button
                      className={
                        queue.is_paused
                          ? "queue-action resume"
                          : "queue-action pause"
                      }
                      onClick={() => toggleQueue(queue)}
                    >
                      {queue.is_paused ? "Resume Queue" : "Pause Queue"}
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <div className="dashboard-grid">
            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Recent Jobs</h3>
                  <p>Latest jobs processed by the system</p>
                </div>

                <button>View All</button>
              </div>
              <section className="dashboard-section">
                <div className="section-header">
                  <div>
                    <h2>Workers</h2>
                    <p>Monitor worker health and activity</p>
                  </div>
                </div>

                <div className="workers-container">
                  {loading ? (
                    <div className="loading-state">Loading workers...</div>
                  ) : workers.length === 0 ? (
                    <div className="empty-state">
                      <h4>No workers registered</h4>
                      <p>Start a worker service to see it here.</p>
                    </div>
                  ) : (
                    <div className="workers-list">
                      {workers.map((worker) => (
                        <div className="worker-card" key={worker.id}>
                          <div className="worker-info">
                            <div className="worker-icon">⚙</div>

                            <div>
                              <h4>{worker.worker_id}</h4>

                              <p>{worker.hostname || "Unknown host"}</p>
                            </div>
                          </div>

                          <div className="worker-status">
                            <span
                              className={`status-dot ${worker.status.toLowerCase()}`}
                            ></span>

                            <span>{worker.status}</span>
                          </div>

                          <div className="heartbeat">
                            <span>Last heartbeat</span>

                            <strong>
                              {worker.last_heartbeat
                                ? new Date(
                                    worker.last_heartbeat,
                                  ).toLocaleTimeString()
                                : "N/A"}
                            </strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="jobs-table-container">
                {loading ? (
                  <div className="loading-state">Loading jobs...</div>
                ) : jobs.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">◉</div>

                    <h4>No jobs yet</h4>

                    <p>Create a job to see it appear here.</p>
                  </div>
                ) : (
                  <table className="jobs-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Job</th>
                        <th>Queue</th>
                        <th>Status</th>
                        <th>Attempts</th>
                      </tr>
                    </thead>

                    <tbody>
                      {jobs.slice(0, 5).map((job) => (
                        <tr key={job.id}>
                          <td>#{job.id}</td>

                          <td>
                            <div className="job-name">{job.name}</div>

                            <div className="job-type">{job.type}</div>
                          </td>

                          <td>{job.queue_name}</td>

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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-header">
                <div>
                  <h3>Workers</h3>
                  <p>Worker health</p>
                </div>
              </div>

              <div className="worker-item">
                <div className="worker-info">
                  <div className="worker-avatar">W</div>

                  <div>
                    <strong>worker-1</strong>
                    <span>Waiting for jobs</span>
                  </div>
                </div>

                <span className="badge success">ACTIVE</span>
              </div>
            </div>
          </div>
          </div>
  )}
        </section>
      </main>
    </div>
  );
}

export default App;