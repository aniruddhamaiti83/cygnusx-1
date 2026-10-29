# CygnusX-1

CygnusX-1 is a prototype for the U.S. SBA loan-origination lifecycle, with a React/Vite frontend, FastAPI backend, persistent application data, and a supervisor-plus-specialist-agent workflow. It is designed for local development first, with CI and manually gated cloud deployment groundwork.

> **Important boundary:** This is not SBA-certified software, a lender-of-record, legal advice, or an automated credit authority. SBA—not the SEC—is the primary program policymaker for ordinary SBA 7(a)/504 lending. The SEC is relevant only if a separate securities-law activity is involved. Do not process real borrower data until the production-readiness gates in [the control matrix](docs/compliance/control-matrix.md) have been approved and tested.

## Start here

- [System architecture and trust boundaries](docs/architecture/system-architecture.md)
- [SBA loan lifecycle and human approval gates](docs/architecture/sba-loan-lifecycle.md)
- [Regulatory / operational control matrix and rollout gates](docs/compliance/control-matrix.md)
- [Enterprise KPI benchmarking rules and acceptance targets](docs/engineering/kpi-benchmarking-rules.md)
- [Qwen Coder enterprise-readiness prompt](docs/engineering/qwen-coder-enterprise-readiness-prompt.md)
- [Cloud deployment runbook](deploy/README.md)
- [Standalone blueprint](public/cygnusx-1-blueprint.html)

## Loan lifecycle supported by the product model

**Customer → Verify/Account → Business → Loan → Pre-application (consumer + commercial credit) → Processing → Collateral → Underwriter (multi-agent swarm + human credit authority) → Documents → Financing/SBA submission and authorization → Closure → Disbursement/use-of-proceeds verification → Servicing/monitoring → Payoff, modification, workout or liquidation → Final closure and retention.**

Process ID is the parent. OEM is 25 tables. CamelCase fields. The application is a workflow prototype; a displayed field or agent response is not proof that the corresponding legal or regulatory control has been satisfied.

## Prerequisites

- Git and Node.js 22+ (the CI workflow uses Node 22)
- Python 3.11+ (CI uses Python 3.12)
- npm
- Optional: Docker Desktop for the containerized API + PostgreSQL stack
- Optional: Ollama or another OpenAI-compatible local LLM endpoint

## Run locally on your laptop

### Option A — easiest local development (SQLite)

From a terminal, clone the repository and install the frontend dependencies:

    git clone https://github.com/aniruddhamaiti83/cygnusx-1.git
    cd cygnusx-1
    npm ci

Install backend dependencies once. On macOS/Linux:

    python3 -m venv backend/.venv
    source backend/.venv/bin/activate
    python -m pip install -r backend/requirements.txt

On Windows PowerShell:

    py -3 -m venv backend/.venv
    .\backend\.venv\Scripts\Activate.ps1
    python -m pip install -r backend/requirements.txt

Run the preflight, then start the integrated local development server from the repository root:

    python runner.py --check
    npm run dev

The development command starts the API through the hardened runner and the Vite frontend. On macOS/Linux, the API uses a private local Unix socket behind Vite. On Windows, the local proxy uses a loopback TCP API. This is intentional: do not start a second API instance while the integrated development server is managing it.

Open the frontend and HTML operations dashboard at:

- App: http://localhost:8080
- HTML operations dashboard: http://localhost:8080/dashboard
- API docs: http://localhost:8080/api/cx1/docs
- Health: http://localhost:8080/api/cx1/health
- Readiness: http://localhost:8080/api/cx1/ready

When the API is run standalone with the root runner instead of the integrated Vite setup, it listens on http://127.0.0.1:8000 by default; the dashboard is then http://127.0.0.1:8000/dashboard. Do not run both modes at once unless both the runner and Vite are configured with CX1_API_TCP=1 so that Vite reuses the existing loopback API process.

#### Allowing trusted LAN users to view the local HTML dashboard

The Vite development server binds to all interfaces, so another device on the same trusted LAN can open http://LAPTOP-LAN-IP:8080/dashboard after the laptop firewall allows the connection. To make the operations metrics endpoint require a token, set a strong random DASHBOARD_TOKEN in the same shell before launching npm run dev; the dashboard prompts the viewer for this token. For example, on macOS/Linux:

    export DASHBOARD_TOKEN="$(python -c 'import secrets; print(secrets.token_urlsafe(32))')"
    npm run dev

Use only a trusted network, restrict inbound firewall access to intended devices, and use synthetic data. The local development auth flag is not suitable for customer traffic. Never port-forward this dev server to the public internet. For remote users outside a trusted LAN, deploy behind TLS, a real identity provider, authorization, and an approved cloud gateway.

The backend defaults to a local SQLite database under backend/data/; no separate database is required for a basic local run. Keep synthetic/test data in local development.

### Option B — Docker Compose with PostgreSQL

1. Install and start Docker Desktop.
2. Copy the example environment file and replace **all** placeholder secrets/passwords with unique random local values. Never commit `.env`.

macOS/Linux:
```bash
cp .env.example .env
```

Windows PowerShell:
```powershell
Copy-Item .env.example .env
```

3. Start the API and database:
```bash
docker compose up --build
```

Compose publishes the API only to host loopback at `127.0.0.1:8000`. Stop with `Ctrl+C`; for detached mode use `docker compose up --build -d` and stop using `docker compose down`. To remove local database volumes, review the volume deletion carefully before using `docker compose down -v`.

The frontend remains a separate local process. Because Compose publishes the API on loopback port 8000, start Vite in TCP-proxy mode so it reuses the container API rather than launching a second backend.

macOS/Linux:

    CX1_API_TCP=1 npm run dev

Windows PowerShell:

    $env:CX1_API_TCP = "1"
    npm run dev

The HTML dashboard is available through Vite at http://localhost:8080/dashboard. The direct container API is available locally at http://127.0.0.1:8000.

For a local Ollama server reached from inside Docker, set `LLM_BASE_URL=http://host.docker.internal:11434/v1` in `.env`. The optional LLM can be omitted; the application has a deterministic heuristic fallback when no provider is configured. A fallback is not a substitute for lender-approved underwriting analysis.

### Option C — PostgreSQL outside Docker

Create a local database, then set `DATABASE_URL` in your shell to a PostgreSQL SQLAlchemy URL, for example:

```text
postgresql://USER:PASSWORD@127.0.0.1:5432/cygnusx1
```

Install backend requirements and run `python runner.py --check` before starting the API. Escape reserved URL characters in credentials. Use a dedicated local user/database, not production credentials.

## Common commands

| Task | Command |
| --- | --- |
| Validate API config and database connectivity | `python runner.py --check` |
| Run API | `python runner.py` |
| Start frontend | `npm run dev` |
| Run frontend lint | `npm run lint` |
| Run TypeScript checks | `npm run typecheck` |
| Run frontend tests | `npm test` |
| Build development frontend | `npm run build:dev` |
| Run backend tests | `cd backend && python -m unittest discover -s tests -v` |
| Start container stack | `docker compose up --build` |

## Application layers

- **Frontend:** React + Vite, normally port 8080.
- **API:** FastAPI, normally port 8000.
- **Database:** SQLite for a simple laptop setup; PostgreSQL is preferred for shared/cloud environments.
- **Agent orchestration:** supervisor plus stage-specific workers and evaluator; output is decision support, not final approval.
- **Operations:** readiness endpoint, health endpoint, HTML dashboard and metrics endpoint.
- **CI/CD:** GitHub Actions for backend tests, frontend lint/typecheck/tests/build and container build. Cloud deployments are manually triggered and require configured cloud infrastructure and secrets.

See [system architecture](docs/architecture/system-architecture.md) for trust boundaries, responsibilities and deployment topology.

## Operations dashboard

The dashboard at `/dashboard` shows request count/rate, p50/p95/p99 latency, 5xx rate, uptime, CPU, process RSS, memory, disk usage, database connectivity/size/table count, and LLM provider configuration. Metrics JSON is available at `/api/cx1/ops/metrics`; in production configure a separate high-entropy `DASHBOARD_TOKEN` and send it in the `X-Dashboard-Token` header. These metrics are per-process and reset on restart. Use CloudWatch or Google Cloud Monitoring for durable fleet-wide telemetry and alerts.

## CI/CD and cloud deployment

Pull requests run the CI workflow in `.github/workflows/ci.yml`. It tests/compiles the backend, runs frontend lint/typecheck/tests and a development build, and builds the API container without publishing it.

Manual deployment workflows exist for:
- Google Cloud Run: `.github/workflows/deploy-cloud-run.yml`
- AWS ECS Fargate: `.github/workflows/deploy-aws-ecs.yml`

Read [deploy/README.md](deploy/README.md) for the GitHub environment, workload identity/OIDC, secret-manager, networking, database and rollout setup. The workflows do **not** provision cloud infrastructure and do not automatically deploy on every pull request. They deploy the API/dashboard container; frontend hosting is separate. Keep cloud services private until authentication, authorization and access policy are reviewed.

## Frontend authentication setting

The tracked `.grok/app-env.json` is a non-secret local/dev default with `VITE_AUTH_ENABLED=false`. Vite embeds this setting into browser JavaScript at build time. Production builds must explicitly set `VITE_AUTH_ENABLED=true` and configure/test the real identity provider, callback URLs, authorization and session lifecycle. Do not deploy development fallback identity to customer traffic.

## Production readiness — blockers before borrower data

This repository has CI/CD groundwork, not production certification. Before handling real borrower data, close and independently test the controls in [the compliance matrix](docs/compliance/control-matrix.md), especially:

1. Replace or formally review startup schema creation with reviewed, versioned, deployable database migrations.
2. Verify every API route has authentication, record-level authorization and audit coverage; add rate limiting and abuse controls.
3. Implement real identity/email verification and approved provider integrations; never count a mock/heuristic result as passed verification.
4. Add document upload limits, malware scanning, safe parsing and prompt-injection defenses.
5. Establish privacy/data retention, encryption, least privilege, security review and incident response.
6. Confirm current SBA SOP/forms and lender policy with the lender's compliance/legal owner; implement effective-dated rules and evidence provenance.
7. Test human approval gates, exception handling, disbursement dual control, fair-lending workflow and applicable notices.
8. Configure TLS, managed secrets, backups/PITR, a tested restore, centralized logs/alerts, dependency/container scanning, load and penetration tests, and a documented rollback.

Use synthetic data until these gates are approved. Do not commit `.env`, provider keys, customer data, tax IDs, credit reports, tokens or production database dumps.
