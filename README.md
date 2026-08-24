# Codity Job Scheduler

A distributed background job scheduling platform built with React, Node.js, Express.js, MySQL, and a worker service.

## Overview

Codity Job Scheduler allows users to create and manage background jobs through a REST API and monitor them through a web dashboard.

The system supports:

- Job creation and scheduling
- Queue management
- Background job processing
- Worker registration and monitoring
- Job retries
- Exponential retry strategy
- Dead Letter Queue (DLQ)
- Job execution tracking
- Worker heartbeat monitoring
- Dashboard metrics

## Tech Stack

### Frontend
- React
- Vite
- Axios
- CSS

### Backend
- Node.js
- Express.js
- JWT Authentication
- REST API

### Database
- MySQL

### Worker
- Node.js
- Background polling
- Job execution
- Retry handling
- Worker heartbeat

## System Architecture

![System Architecture](docs/architecture.png)

The system consists of three main parts:

1. **React Dashboard**  
   Provides the user interface for monitoring jobs, queues and workers.

2. **Express.js API**  
   Handles authentication, projects, queues, jobs and metrics.

3. **Worker Service**  
   Polls the database for jobs, executes them, handles retries and updates job status.

MySQL is used as the central database shared by the API and worker.

## Database Design

![ER Diagram](docs/ER2.png)

The database contains entities for:

- Users
- Organizations
- Projects
- Queues
- Jobs
- Retry Policies
- Workers
- Job Executions
- Job Logs
- Dead Letter Jobs
- Worker Heartbeats

## Job Processing Flow

```text
User
  ↓
Create Job
  ↓
Queue
  ↓
Worker Claims Job
  ↓
Execute Job
  ↓
 ┌───────────────┐
 │               │
Success        Failure
 │               │
 ↓               ↓
COMPLETED      Retry
                 ↓
              FAILED
                 ↓
          Max Attempts?
            ↓       ↓
           No       Yes
           ↓         ↓
         Retry      DLQ

API Modules

The backend provides REST APIs for:

Authentication
Projects
Queues
Jobs
Workers
Metrics
Retry and Dead Letter Queue

Failed jobs can be retried according to the configured retry policy.

The project currently supports:

Fixed retry
Linear retry
Exponential retry

When a job reaches its maximum number of attempts, it is moved to the Dead Letter Queue (DLQ).

Worker Monitoring

Workers periodically send heartbeat information to the backend database.

This allows the dashboard to display:

Worker status
Worker hostname
Last heartbeat
Active workers
Offline workers
Testing

The system was tested for:

Successful job execution
Failed job execution
Job retry
Maximum retry attempts
Dead Letter Queue
Scheduled jobs
Worker registration
Worker heartbeat
Queue pause/resume
Dashboard metrics

Project Structure
codity-job-scheduler/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   └── server.js
│
├── worker/
│   └── worker.js
│
├── frontend/
│   └── React dashboard
│
├── docs/
│   ├── architecture.png
│   └── er-diagram.png
│
└── README.md

Running the Project
Start Backend
cd backend
npm install
npm start
Start Worker

Open another terminal:

cd worker
npm install
npm start
Start Frontend

Open another terminal:

cd frontend
npm install
npm run dev

Make sure MySQL is running and the database configuration is correctly set in the backend.

Conclusion

Codity Job Scheduler demonstrates a distributed background job processing system with queues, workers, retries, monitoring and failure handling through a simple web dashboard.


---

