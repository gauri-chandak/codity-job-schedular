\# Codity Job Scheduler - Design Decisions



\## 1. REST API



We use a REST API between the React frontend and the backend.



This keeps the frontend and backend separate and makes the system easier to maintain.



\## 2. MySQL Database



MySQL is used as the central database for users, projects, queues, jobs, workers, executions, logs, retries, and heartbeats.



A relational database was chosen because the system contains many related entities.



\## 3. Separate Worker Service



Job processing is handled by a separate worker service instead of the API server.



This allows jobs to run in the background without blocking API requests.



\## 4. Queue-Based Processing



Jobs are placed into queues before execution.



Workers poll the queues and claim available jobs for processing.



This allows multiple workers to process jobs concurrently.



\## 5. Retry Strategy



Failed jobs can be retried using configurable policies.



The supported strategies are:



\- Fixed delay

\- Linear backoff

\- Exponential backoff



This improves reliability when temporary failures occur.



\## 6. Dead Letter Queue



Jobs that continue to fail after reaching the maximum number of attempts are moved to the Dead Letter Queue (DLQ).



This prevents continuously failing jobs from being retried forever.



\## 7. Worker Heartbeats



Workers periodically update their heartbeat information.



The dashboard uses this information to monitor worker health and activity.



\## 8. Job Execution Tracking



Job executions are stored separately from jobs.



This allows the system to maintain execution history, attempts, worker assignment, and timestamps.



\## 9. React Dashboard



React is used for the dashboard because it provides a simple way to build reusable UI components and display frequently changing job and worker information.



\## 10. Modular Backend



The backend is divided into separate modules for authentication, projects, queues, jobs, workers, and metrics.



This makes the code easier to understand, test, and maintain.



\## Conclusion



The design focuses on reliability, separation of responsibilities, database consistency, retry handling, worker monitoring, and maintainability rather than adding unnecessary features.

