\# Codity Job Scheduler - API Documentation



\## Overview



Codity Job Scheduler provides REST APIs for authentication, projects, queues, jobs, workers, and system metrics.



Base URL:



http://localhost:5000/api



\## Authentication



Authentication is handled using JWT.



\### Login



POST /auth/login



Request:



{

&#x20; "email": "user@example.com",

&#x20; "password": "password"

}



The API returns an authentication token for protected requests.



\## Projects



\### Get Projects



GET /projects



Returns available projects.



\### Create Project



POST /projects



Creates a new project.



\## Queues



\### Get Queues



GET /queues



Returns available job queues.



\### Create Queue



POST /queues



Creates a queue with configuration such as priority, concurrency limit, and retry policy.



\### Pause / Resume Queue



PATCH /queues/:id/pause



Pauses or resumes a queue.



\## Jobs



\### Create Job



POST /jobs



Creates a new background job.



Supported information includes:



\- Job name

\- Job type

\- Queue

\- Payload

\- Priority

\- Maximum attempts

\- Scheduled time



\### Get Jobs



GET /jobs



Returns jobs from the scheduler.



\### Get Job



GET /jobs/:id



Returns details of a specific job.



\### Get Job Executions



GET /jobs/:id/executions



Returns execution information for a job.



\## Workers



\### Get Workers



GET /workers



Returns registered workers and their current status.



Worker information includes:



\- Worker ID

\- Hostname

\- Status

\- Last heartbeat



\## Metrics



\### Get System Metrics



GET /metrics



Returns scheduler statistics such as:



\- Total jobs

\- Queued jobs

\- Completed jobs

\- Failed jobs

\- Worker information



\## Job Lifecycle



QUEUED

&#x20;  ↓

CLAIMED

&#x20;  ↓

RUNNING

&#x20;  ↓

COMPLETED



If execution fails:



RUNNING

&#x20;  ↓

FAILED

&#x20;  ↓

Retry

&#x20;  ↓

RUNNING



After the maximum number of attempts:



FAILED

&#x20;  ↓

DLQ



\## Retry Policies



The scheduler supports:



\- Fixed delay

\- Linear backoff

\- Exponential backoff



The retry policy determines when a failed job is attempted again.



\## Error Handling



Common HTTP status codes:



200 - Successful request

201 - Resource created

400 - Invalid request

401 - Authentication required

404 - Resource not found

500 - Server error

