# CygnusX-1

SBA Quote-to-Cash origination: Customer → verify/account → Business → Loan →
Pre-application (consumer + commercial credit) → Processing → Collateral →
Underwriter (multi-agent swarm) → Documents → Financing → Closure.

Process ID is the parent. OEM is 25 tables. CamelCase fields.

**Repo:** [https://github.com/aniruddhamaiti83/cygnusx-1](https://github.com/aniruddhamaiti83/cygnusx-1)

## Open in VS Code

```bash
git clone https://github.com/aniruddhamaiti83/cygnusx-1.git
cd cygnusx-1
code .
```

Or in VS Code: **Command Palette → Git: Clone** → paste
`https://github.com/aniruddhamaiti83/cygnusx-1.git`

Private repo: sign in to GitHub in VS Code if prompted
(`GitHub Pull Requests and Issues` / `GitHub` extension).

## Local stack

| Layer | Location | Port |
| --- | --- | --- |
| Frontend | React + Vite (`src/`) | 8080 |
| API | FastAPI (`backend/`) | 8000 |
| Database | PostgreSQL, or SQLite if `DATABASE_URL` is unset | — |
| Agents | LangChain supervisor + stage workers | — |

### 1. Database

```bash
createdb cygnusx1
export DATABASE_URL=postgresql://USER:PASS@localhost:5432/cygnusx1
```

### 2. Local LLM (optional)

```bash
export LLM_BASE_URL=http://127.0.0.1:11434/v1
export LLM_API_KEY=ollama
export LLM_MODEL=llama3.1
```

If `LLM_BASE_URL` is empty, the swarm uses xAI when `XAI_API_KEY` is set,
otherwise a deterministic heuristic so origination still runs.

### 3. Python API

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python runner.py
```

### 3b. FastAPI in Docker (port 8000)

From the repo root. Postgres is on the Compose network; the API is published on **8000**.

```bash
cp .env.example .env   # required — replace the placeholder passwords and secrets
docker compose up --build
```

Health: [http://127.0.0.1:8000/api/cx1/health](http://127.0.0.1:8000/api/cx1/health)

`npm run dev` still proxies `/api/cx1` to that port.

SQLite only (no Postgres):

```bash
docker build -t cygnusx1-api ./backend
docker run --rm -p 8000:8000 -v cygnusx1-data:/app/data cygnusx1-api
```

Local Ollama from the container: set `LLM_BASE_URL=http://host.docker.internal:11434/v1` in `.env`.

### 4. Frontend

```bash
npm install
npm run dev
```

`npm run dev` starts FastAPI on port 8000 if it is not already running, then the UI.
You can also start the API on its own:

```bash
npm run api
```

`/api/cx1` is proxied to FastAPI. Origination writes PostgreSQL tables. Stage
buttons dispatch LangChain workers that persist `CreditPull`, `SanctionsScreen`,
`KybReport`, `ScorecardResult`, and `AgentEvent`. The underwriter scorecard
recommends; the human of record decides.

## Blueprint

Standalone review copy: [`public/cygnusx-1-blueprint.html`](public/cygnusx-1-blueprint.html)

Design sections at the front:

1. Data model (OEM)
2. Process flow with tables updated
3. Agent orchestration (supervisor → stage workers → evaluator)

Phase 2 in-app: Collateral + Underwriter multi-agent stage.

## Operations dashboard and server runner

The FastAPI server can be started from the repository root using:

```bash
python runner.py
# In another shell, validate runtime configuration and DB connectivity:
python runner.py --check
```

The default local API is `http://127.0.0.1:8000`. OpenAPI docs are at
`/api/cx1/docs`, health at `/api/cx1/health`, readiness at `/api/cx1/ready`,
and the live HTML operations dashboard is `/dashboard`. The dashboard displays
request count/rate, p50/p95/p99 latency, 5xx rate, uptime, CPU, process RSS,
memory, disk usage, database size/connect latency/table count, and LLM provider
configuration. Metrics are at `/api/cx1/ops/metrics`.

For production, set `APP_ENV=production`, PostgreSQL `DATABASE_URL`, a
cryptographically random `SECRET_KEY` (32+ characters), a separate random
`DASHBOARD_TOKEN` (32+ characters), and explicit browser origins in
`CORS_ORIGINS`. The runner intentionally refuses unsafe production defaults.
Generate secrets locally with Python, for example:

```bash
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

When using Docker Compose, change every placeholder in `.env` first and run
`docker compose up --build -d`. The API port binds to loopback by default.
Do not publish a laptop port directly to the public internet; use a managed
cloud endpoint or an authenticated VPN/tunnel with TLS and appropriate access
controls. For local frontend development, use `npm ci` then `npm run dev`.

## CI/CD and cloud

GitHub Actions validates Python compilation/tests, frontend lint/types/tests,
and a container build for pull requests. A manually triggered Google Cloud Run
workflow is included at `.github/workflows/deploy-cloud-run.yml`; requirements
and GitHub variables/secrets are documented in `deploy/README.md`. AWS ECS
Fargate/RDS deployment planning is also documented there. Cloud account resources
and IAM policies must be configured by the deployment owner; no cloud deployment
is performed automatically from this repository setup.

## Production-readiness status

This is production-oriented groundwork, **not a client production certification**.
Before any real borrower/customer traffic, the security issues in the rollout
checklist in `deploy/README.md` must be closed and independently tested. In
particular, the current local schema creation behavior must be replaced with
reviewed, versioned migrations, public intake and authentication endpoints need
abuse controls, and identity verification must use a real challenge flow. Runtime
metrics are instance-local and reset on restart; use CloudWatch or Google Cloud
Monitoring for retained fleet-wide telemetry and alerting.
