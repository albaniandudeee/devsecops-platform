# DevSecOps Platform

A production-style DevSecOps platform built to demonstrate practical backend engineering, Linux administration, containerization, CI/CD, security automation, observability, backup/recovery, and deployment operations.

The project is intentionally designed as more than a demo API: it includes authentication and authorization, asynchronous audit processing, production Docker images, security gates in CI, monitoring, failure testing, database recovery, and repeatable deployment/rollback tooling.

> **Current status:** Core application, DevSecOps pipeline, production-style Docker stack, observability, backup/recovery, and deployment tooling are implemented and tested. Cloud deployment, DNS, and public HTTPS are the remaining final delivery steps.

---

## Architecture

```text
                         GitHub
                            │
                         git push
                            │
                            ▼
                    GitHub Actions CI/CD
                            │
              ┌─────────────┼─────────────┐
              │             │             │
          npm audit       Tests        Build
              │             │             │
              └─────────────┼─────────────┘
                            │
                     Docker images
                            │
                 ┌──────────┴──────────┐
                 │                     │
               Trivy                  SBOM
                 │                     │
             security gate             │
                 └──────────┬──────────┘
                            │
                         GHCR
                            │
                            ▼
                 Production deployment
                            │
                       Nginx :80
                            │
                            ▼
                       API :3000
                     ┌──────┼──────┐
                     │      │      │
                     ▼      ▼      ▼
                PostgreSQL Redis  Worker
                              │      │
                              └─BullMQ

                Prometheus ───────► Grafana
                       │
                       └── API + Worker metrics
```

### Main components

| Component            | Purpose                                   |
| -------------------- | ----------------------------------------- |
| Node.js + TypeScript | Application runtime and type-safe backend |
| Express              | HTTP API                                  |
| PostgreSQL           | Persistent relational data                |
| Drizzle ORM          | Database access and migrations            |
| Redis                | Queue infrastructure                      |
| BullMQ               | Asynchronous audit-event processing       |
| Nginx                | Reverse proxy and public HTTP entry point |
| Docker               | Containerization and reproducible runtime |
| Docker Compose       | Local/production-style orchestration      |
| GitHub Actions       | CI/CD automation                          |
| GHCR                 | Container image registry                  |
| Trivy                | Container vulnerability scanning          |
| CycloneDX SBOM       | Software inventory artifact               |
| CodeQL               | Static security analysis                  |
| Gitleaks             | Secret detection                          |
| npm audit            | Dependency vulnerability gate             |
| Prometheus           | Metrics collection                        |
| Grafana              | Metrics visualization                     |
| Bash                 | Backup/deployment/rollback automation     |

---

## Application capabilities

### Authentication

* User registration
* Password hashing with Argon2id
* Login/logout
* Session management
* Session revocation
* Secure cookie handling
* Password validation with Zod
* Registration password length: 12–128 characters

### Authorization

The project implements role-based access control with:

* `owner`
* `admin`
* `member`

Project membership is checked before protected project operations are allowed.

### Audit logging

Security-relevant operations generate audit events. Events are placed on a Redis/BullMQ queue and processed asynchronously by a dedicated worker.

This keeps audit processing separated from the main API request path while providing queue-backed processing.

### API protection

The API includes:

* Helmet security headers
* Express rate limiting
* Request IDs
* Request context middleware
* Zod input validation
* Centralized application errors
* Centralized error handling
* Proxy-aware configuration
* Authentication middleware
* Project authorization middleware

---

## Health and readiness

The API exposes separate endpoints for different operational purposes:

```text
GET /health
GET /health/live
GET /health/ready
GET /health/db
GET /metrics
```

### Liveness

`/health/live` verifies that the application process is alive.

### Readiness

`/health/ready` checks the dependencies required for the application to operate:

* PostgreSQL
* Redis

If either dependency becomes unavailable, the service reports `not_ready` instead of pretending the application is fully operational.

### Database health

`/health/db` performs an actual database query through Drizzle and reports database health independently from application liveness.

---

## Metrics and observability

Prometheus scrapes both the API and worker.

### API

The API exposes request and application metrics through `/metrics`.

Metrics include request rates, latency, status groups, and application-specific measurements.

### Worker

The worker exposes metrics on port `3001` internally, including:

```text
worker_jobs_completed_total
worker_jobs_failed_total
worker_jobs_active
worker_job_duration_seconds
```

### Queue metrics

The API also exposes BullMQ audit queue metrics such as:

```text
audit_queue_waiting
audit_queue_active
audit_queue_completed
audit_queue_failed
audit_queue_delayed
```

Grafana is provisioned with Prometheus as its datasource and includes a project dashboard.

---

## Docker architecture

The API uses a multi-stage Dockerfile with separate stages for:

```text
build
production-deps
migration
production
```

The production image contains only the compiled application and production dependencies.

The migration image is separate so database migrations can be executed independently from the application runtime.

The production runtime removes npm/npx from the final image and runs the application as the non-root `node` user.

The deployable images also install the required Debian security update for `libpcre2-8-0` during image construction.

---

## Production Compose stack

`infrastructure/docker/compose.production.yml` defines:

* PostgreSQL
* Redis
* migration job
* API
* worker
* Prometheus
* Grafana
* Nginx

The API is internal to the Compose network and is reached through Nginx.

PostgreSQL, Redis, Prometheus, and the worker communicate over the internal Docker network.

Persistent volumes are used for database, Redis, Prometheus, and Grafana data.

---

## Nginx

Nginx is the reverse proxy and external entry point.

Responsibilities include:

* forwarding requests to the API
* forwarding the original host and client/proxy information
* propagating request IDs
* connection/send/read timeouts
* hiding Nginx version information with `server_tokens off`

HTTPS/TLS is intentionally a deployment-stage task and will be added when the application is deployed with a real domain.

---

## CI/CD pipeline

The main workflow is `.github/workflows/ci.yml`.

### Test job

The test job starts PostgreSQL and Redis services and then performs:

1. Node.js setup
2. `npm ci`
3. `npm audit --audit-level=high`
4. Drizzle migrations
5. TypeScript build
6. automated tests

### Container job

The container job:

1. builds the production API image
2. builds the migration image
3. scans both images with Trivy
4. fails on HIGH or CRITICAL vulnerabilities
5. generates CycloneDX SBOMs
6. saves the images as artifacts

Trivy is configured to ignore unfixed vulnerabilities but does **not** suppress vulnerabilities that have an available fix.

### Publish job

After the security/container stage passes, the images are published to GitHub Container Registry:

```text
ghcr.io/<owner>/<repo>/api:<sha>
ghcr.io/<owner>/<repo>/api:main

ghcr.io/<owner>/<repo>/migrate:<sha>
ghcr.io/<owner>/<repo>/migrate:main
```

---

## Security automation

### Trivy

Trivy scans the final deployable container images for known vulnerabilities.

During development, the CI pipeline detected Debian `libpcre2-8-0` vulnerabilities in the base image. Instead of ignoring the findings, the Dockerfile was changed to install the fixed Debian package during image construction.

The rebuilt production and migration images were rescanned and verified with zero HIGH/CRITICAL findings.

This provides a real security-remediation workflow:

```text
Detect
  ↓
Identify vulnerable layer/package
  ↓
Apply remediation
  ↓
Rebuild
  ↓
Rescan
  ↓
Pass CI security gate
```

### CodeQL

`.github/workflows/codeql.yml` runs CodeQL analysis for JavaScript/TypeScript using the security-extended query suite.

### Gitleaks

`.github/workflows/secrets.yml` scans commits for accidentally committed secrets.

### Dependency audit

The CI test job runs npm audit with a HIGH severity threshold.

---

## Database

PostgreSQL 18 is used as the primary database.

The schema includes tables for:

```text
users
sessions
projects
project_members
audit_logs
```

Database changes are managed through Drizzle migrations.

Migrations are executed through the dedicated migration container before the API is started in the production-style deployment.

---

## Backup and recovery

The project includes:

```text
infrastructure/backup/postgres-backup.sh
```

The script creates PostgreSQL custom-format backups using `pg_dump -Fc`.

Example:

```bash
./infrastructure/backup/postgres-backup.sh
```

Backups are stored under `./backups/` and are excluded from Git through `.gitignore`.

### Recovery test

A real backup/restore test was performed using PostgreSQL custom-format backup and `pg_restore`.

The backup was restored into a temporary database and verified by checking:

* all expected tables
* user count
* project count

The temporary restore database was then removed.

This verifies that the backup is not merely being created; it can actually be restored.

---

## Deployment automation

### Deployment

```text
infrastructure/deploy/deploy.sh
```

The deployment script:

1. validates required environment variables
2. pulls API and migration images
3. starts PostgreSQL and Redis
4. waits for dependencies
5. runs migrations
6. starts API, worker, Prometheus, Grafana, and Nginx
7. waits for the readiness endpoint
8. reports deployment failure if the API does not become ready

### Rollback

```text
infrastructure/deploy/rollback.sh
```

The rollback script accepts specific API and migration image references so a previous image version can be restored.

A future improvement is to make database migrations fully backward-compatible with application rollback, using an expand/contract migration strategy. This avoids relying on a newer database schema being compatible with older application code.

---

## Failure and resilience testing

The application was tested against dependency failures.

### PostgreSQL failure

When PostgreSQL was stopped:

* liveness remained healthy
* readiness changed to `not_ready`
* database health reported unhealthy

After PostgreSQL was restored, readiness returned to healthy.

### Redis failure

When Redis was stopped:

* liveness remained healthy
* readiness changed to `not_ready`
* PostgreSQL remained healthy
* Redis connection/reconnect errors were visible in application logs

After Redis was restored, readiness returned to healthy.

These tests demonstrate the difference between **process liveness** and **dependency readiness**.

---

## Local development

### Requirements

* Node.js 24+
* npm
* Docker Engine
* Docker Compose

### Install dependencies

```bash
npm ci
```

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

### Development API

```bash
npm run dev
```

### Worker

```bash
npm run worker
```

---

## Environment configuration

Secrets are intentionally excluded from Git.

Use `.env.example` as the configuration template.

Important variables include:

```text
DATABASE_HOST
DATABASE_PORT
DATABASE_NAME
DATABASE_USER
DATABASE_PASSWORD
REDIS_URL
API_IMAGE
MIGRATION_IMAGE
GRAFANA_ADMIN_PASSWORD
```

The real `.env` file is ignored by Git.

---

## Useful Docker commands

Start the development Compose stack:

```bash
docker compose up -d
```

Check services:

```bash
docker compose ps
```

View logs:

```bash
docker compose logs -f api
```

Stop services without deleting volumes:

```bash
docker compose stop
```

Build the production API image:

```bash
docker build \
  --target production \
  -t devsecops-platform-api:latest \
  -f apps/api/Dockerfile .
```

Build the migration image:

```bash
docker build \
  --target migration \
  -t devsecops-platform-migrate:latest \
  -f apps/api/Dockerfile .
```

---

## Repository structure

```text
.
├── apps/
│   └── api/
│       ├── src/
│       │   ├── auth/
│       │   ├── audit/
│       │   ├── db/
│       │   ├── errors/
│       │   ├── metrics/
│       │   ├── middleware/
│       │   ├── projects/
│       │   ├── queue/
│       │   ├── users/
│       │   ├── __tests__/
│       │   ├── app.ts
│       │   ├── index.ts
│       │   └── worker.ts
│       └── Dockerfile
├── database/
│   └── migrations/
├── infrastructure/
│   ├── backup/
│   ├── deploy/
│   ├── docker/
│   ├── grafana/
│   ├── nginx/
│   └── prometheus/
├── .github/
│   └── workflows/
│       ├── ci.yml
│       ├── codeql.yml
│       └── secrets.yml
├── docker-compose.yml
├── drizzle.config.ts
├── package.json
├── package-lock.json
└── tsconfig.json
```

---

## Planned cloud deployment

The final deployment target is a cloud VM with the following architecture:

```text
Internet
   │
   ▼
DNS / Domain
   │
   ▼
HTTPS :443
   │
   ▼
Nginx
   │
   ▼
API
 ┌─┴─────────────┐
 ▼               ▼
PostgreSQL      Redis
                   │
                   ▼
                 Worker

Prometheus ─────► Grafana
```

The planned deployment includes:

* AWS EC2
* Docker Compose
* AWS Security Groups
* SSH key authentication
* domain DNS
* HTTPS/TLS
* public Nginx only
* private PostgreSQL/Redis/Prometheus services
* GitHub Actions → GHCR → deployment workflow

AWS EC2 is the preferred cloud target because it adds practical AWS infrastructure experience while allowing the existing Docker Compose architecture to remain simple and understandable.

---

## Future improvements

Potential future evolution includes:

* automated remote deployment from GitHub Actions
* AWS EC2 deployment
* DNS and HTTPS
* expand/contract database migration strategy
* centralized production log collection
* automated backup scheduling and retention
* AWS CloudWatch integration
* infrastructure-as-code with Terraform
* container orchestration migration to ECS
* managed PostgreSQL/Redis as a future cloud architecture

These are future evolution paths rather than requirements for the current platform.

---

## What this project demonstrates

This project demonstrates practical experience across the full DevSecOps lifecycle:

```text
Development
    ↓
TypeScript / Express / PostgreSQL
    ↓
Testing
    ↓
CI/CD
    ↓
Docker
    ↓
Security scanning
    ↓
SBOM generation
    ↓
Container registry
    ↓
Deployment automation
    ↓
Observability
    ↓
Backup / restore
    ↓
Failure testing
    ↓
Rollback
    ↓
Cloud deployment
```

The goal is not to claim that a single project represents every production technology. The goal is to demonstrate that the full lifecycle—from writing the application to securing, testing, containerizing, monitoring, backing up, deploying, and recovering it—can be implemented and understood end to end.

---

## Author

**Lorenzo Jashari**

DevOps / Linux / System Administration portfolio project.
