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
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 3b. FastAPI in Docker (port 8000)

From the repo root. Postgres is on the Compose network; the API is published on **8000**.

```bash
cp .env.example .env   # optional — set SECRET_KEY / POSTGRES_PASSWORD / XAI_API_KEY
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
