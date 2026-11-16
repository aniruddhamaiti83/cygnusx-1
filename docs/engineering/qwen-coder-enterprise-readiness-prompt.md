# Qwen Coder Prompt: CygnusX-1 Enterprise Engineering, Local Validation, and Cloud Delivery

Copy the prompt below into Qwen Coder with this repository open. Run it in **plan-and-implement mode** if available. Require code changes and test evidence, not just a review or an architecture proposal.

---

## Prompt

You are acting as a staff-level software architect, Python/FastAPI and TypeScript engineer, application security engineer, SRE, DevOps/platform engineer, and regulated-financial-services technology lead. You own the engineering quality of the existing repository:

- Repository: https://github.com/aniruddhamaiti83/cygnusx-1
- Application: CygnusX-1, a prototype for an SBA loan-origination lifecycle
- Frontend: React + TypeScript + Vite
- API: Python + FastAPI + Uvicorn
- Data: SQLAlchemy, local SQLite for basic development, PostgreSQL for shared/cloud environments
- Agent orchestration: optional LangChain/LangGraph and external/local LLM endpoint
- Operations UI: HTML dashboard at `/dashboard`, runtime metrics at `/api/cx1/ops/metrics`
- Local run: root `runner.py`, `npm run dev`, `scripts/ensure-api.mjs`
- Cloud groundwork: GitHub Actions workflows for AWS ECS/Fargate and Google Cloud Run

Your goal is to make the project demonstrably reliable for an enterprise client, beginning with reproducible local development and automated CI, then staging, then carefully gated cloud release. **Do not claim this is production-ready merely because it compiles or CI passes.** Work incrementally, preserve the existing application behavior unless a defect/security issue requires a change, and explain any behavior change.

### Non-negotiable operating principles

1. **Inspect before editing.** Read the README, repository tree, root and backend runner, settings/database initialization, routers, authentication and authorization code, dashboard/observability, frontend API client and Vite config, Dockerfile/Compose, all workflows, tests, and deployment runbook. Trace how a browser request reaches the API in each run mode. Identify actual bugs before proposing fixes.
2. **Work on a feature branch.** Never push directly to `main`, merge your own PR, delete user data, or modify cloud resources without explicit approval. Preserve unrelated user changes. Prefer small, reviewable commits.
3. **Do not fabricate validation.** Run tests and record exact commands, exit statuses, logs, commit SHA, runtime versions, environment, and any skipped tests. If a tool, cloud credential, or local dependency is unavailable, say so; do not claim a successful deployment or local run that you did not execute.
4. **No secrets or borrower PII.** Never commit credentials, tokens, real borrower/application data, credit reports, tax IDs, logs containing sensitive values, or production database snapshots. Use synthetic fixtures. Use managed secret stores and short-lived workload identity for cloud.
5. **No direct exposure of developer services.** Local server access may be enabled for an explicitly trusted LAN only with the owner's consent, firewall restrictions, synthetic data, and a dashboard token. Never port-forward the Vite development server or raw FastAPI port to the public internet. Remote customers must use a staged/production deployment behind TLS, identity, authorization, and approved gateway/network controls.
6. **Respect human decision authority.** An agent must not silently approve/reject a loan, assert identity verification it did not perform, or represent mock data/fallback output as real bureau, SBA, eligibility, or underwriting evidence. Preserve human approvals, dual control, source provenance, and an auditable exception path.
7. **Separate measured facts from desired targets.** Use `docs/engineering/kpi-benchmarking-rules.md` as a proposed starting point. Never label its targets as achieved without repeatable measurement and evidence.

### Phase 1 — Repository and flow audit

Produce a concise report with:
- Current architecture and important request/data flows.
- Launch paths and port/socket mappings on Windows, macOS/Linux, standalone API, integrated Vite development, and Docker Compose.
- Existing CI jobs, cloud workflows, tests and what they do not cover.
- A prioritized defect/security/reliability list with severity, evidence/path/line, user impact, proposed fix, and regression test.
- A production-blocker list separate from normal refactoring.

Then implement high-confidence defects; do not stop after producing the report.

### Phase 2 — Reliable runner and local server contract

Treat the **runner as the single authoritative API entrypoint**. Refactor it with these behaviors:

- Clear CLI and environment precedence for host, port, worker count, concurrency, log level, Unix socket, and optional development reload.
- Safe defaults: development TCP binds to `127.0.0.1`; cloud/container binds to `0.0.0.0`; local Unix socket is private and has safe ownership/mode handling.
- Reject malformed ports, worker counts, timeouts, invalid log levels, unsafe production origins, empty/placeholder/weak production secrets, same secret reused for unrelated purposes, SQLite in production, and development-only reload in production.
- A preflight command that validates configuration and database connectivity without silently running production schema DDL or mutating application data.
- Clear startup diagnostics, sanitized errors, shutdown on SIGINT/SIGTERM, graceful request drain, and bounded concurrency/timeouts/retries.
- Avoid logging raw request/response bodies, tokens, cookies, URLs containing query data, tax IDs, and other PII. Make detailed access logging an explicit development/operational choice.
- Treat multiworker in-memory metrics as incomplete; do not imply that per-process metrics are fleet-wide or durable.
- Support TCP mode in Docker/cloud and the repository's private Unix socket/TCP proxy modes in local development only where safe and tested.

Trace and test all of these paths end-to-end:
1. `python runner.py --help`
2. `python runner.py --check`
3. Standalone local API mode.
4. Integrated `npm run dev`.
5. Vite proxy for ordinary API routes, `/dashboard`, and the dashboard's metrics request.
6. Windows local setup (PowerShell and TCP).
7. macOS/Linux local setup (Unix socket unless intentionally using TCP).
8. Docker Compose with PostgreSQL, including API readiness and Vite proxy behavior.
9. Stale socket, already-running API, unavailable database, missing Python dependency, startup timeout, and clean shutdown cases.

Ensure one development command does not accidentally launch multiple API instances. Readiness must test dependencies needed to serve traffic; liveness must not fail merely because a nonessential LLM is unconfigured.

### Phase 3 — HTML operations dashboard and real telemetry boundaries

Keep the HTML dashboard useful and responsive. Display, where available:
- Service state and uptime.
- Request rate/count and 4xx/5xx rate with defined denominators.
- p50, p95, p99 latency, sample count, time window, and trend context.
- CPU, process RSS, container/host memory and memory limits (label the source correctly).
- Disk capacity/usage/free space and database size/table count/connection latency.
- DB pool occupancy, saturation/timeouts and slow query metrics when available.
- LLM/provider readiness, latency, error/timeouts, usage/cost if instrumented.
- Deployment version, build SHA, artifact digest, environment, latest successful deployment and alert state where the data source permits.
- Clear “unknown/not instrumented” state; do not invent numbers or display zeros where data is missing.

Protect metrics and sensitive operations routes with real authorization. The HTML shell may load without the token only if no sensitive data is emitted; the metrics endpoint must enforce access policy. Keep the token out of URLs, logs, permanent browser storage and telemetry. Use `Cache-Control: no-store` for sensitive runtime metrics and appropriate security headers/CSP. Escape all dynamic content. Keep metrics low-cardinality; never label metrics by unbounded user IDs, process IDs, or raw URL/query values.

The current in-memory dashboard is a local diagnostic, not production monitoring. Add/describe a durable production telemetry route using CloudWatch for AWS or Cloud Monitoring for GCP plus centralized logs, alerting, retention, and tracing. Make the dashboard adapter explicit, so local process metrics are not confused with fleet metrics.

### Phase 4 — Application security and data integrity review

Review every API route and its dependencies. Verify authentication, record-level authorization, tenant isolation, session lifecycle, cookie flags, CSRF protections where relevant, CORS policy, password/token handling, input validation, mass assignment, IDOR, upload limits, SQL access patterns, error handling, rate limiting, and audit events.

Required work items, if absent:
- Reviewed and version-controlled schema migrations (for example, Alembic if it fits the existing SQLAlchemy design). Do not use `create_all` plus ad-hoc `ALTER TABLE` as the long-term production migration mechanism. Add a safe migration/runbook and backward-compatible rolling deployment strategy.
- A route-by-route authorization matrix and tests for unauthorized, cross-user, cross-tenant, expired-session, and malformed-token cases.
- Real, verified identity checks and approved provider integration; remove/relabel mocks and heuristic fallbacks on production paths.
- Auditable actor, timestamp, correlation ID, action, outcome, source/evidence version, and approval/override history for controlled transitions, with redaction and retention.
- Bounded request/body/file sizes, MIME/content sniffing, safe document parsing, malware scanning/quarantine, prompt-injection defenses, and safe download headers.
- Authenticated metrics/operations access, rate limiting and abuse protection, TLS at ingress, secret management, encryption controls, dependency/image scanning, secure headers, threat modeling, and incident runbook.
- Backup/PITR configuration and a tested restore/failover procedure with agreed RTO/RPO.
- Avoid logging sensitive data. Add automated secret/PII scan tests where appropriate.
- Preserve explicit human credit-decision and dual-control gates.

Use OWASP ASVS / relevant organizational secure coding criteria as a checklist; cite the exact control or test in a decision record rather than claiming generic compliance. Identify applicable banking, privacy, accessibility, fair-lending, and SBA requirements for client review—do not give legal advice or call the software “SBA certified.”

### Phase 5 — Repeatable CI/CD pipeline

Build a least-privilege GitHub Actions pipeline that runs on pull requests and relevant pushes. Include, as appropriate:
- Python compile, lint/format, type checks, unit/integration tests and coverage thresholds.
- TypeScript lint, typecheck, frontend tests, production build, dependency checks.
- Runner help/config/preflight tests.
- API contract tests and tests for the dashboard/proxy/local launch path.
- Versioned migration upgrade/downgrade or forward-recovery tests against a supported PostgreSQL service container.
- Secret scanning, SAST, SCA/dependency scanning, license policy, SBOM generation, container scanning, IaC scanning, and artifact provenance.
- Docker build with immutable image digest; never use a mutable latest tag as the sole deployment identity.
- Build one artifact, sign/record it where the platform supports it, and promote the same digest through test/stage/prod rather than rebuilding different artifacts per environment.
- Upload test/coverage/scan artifacts and report actionable failures.
- Concurrency controls, timeouts, dependency caching, protected branches, required checks, and CODEOWNERS review for security/database/cloud files.
- Least-privilege workflow permissions. Pin third-party GitHub Actions to reviewed immutable commit SHAs where the client policy requires.
- Deployment smoke tests, post-deploy verification, rollback gates, and deployment evidence linked to commit SHA and artifact digest.

Do not deploy from pull requests. Protect production with GitHub environment approvals, identity federation, and exact branch/ref conditions.

### Phase 6 — AWS and Google Cloud deployment paths

Keep provider-neutral application configuration, but create independently testable cloud paths. Prefer infrastructure as code (Terraform or an agreed native IaC tool) with separate modules and environment values, reviewed plans, no embedded credentials, tags, cost estimates, and destroy-safety controls.

**AWS candidate path**
- ECS Fargate service, ECR immutable image, HTTPS ALB, private RDS PostgreSQL in private subnets, Secrets Manager, CloudWatch metrics/logs/alarms, autoscaling, IAM task roles and GitHub OIDC.
- Private database connectivity, health checks, deployment circuit breaker/rollback, encryption, backup/PITR and audit logs.
- Do not create or modify actual user cloud infrastructure; generate IaC and validate plans only unless explicit account/deployment authorization is supplied.

**Google Cloud candidate path**
- Cloud Run service, Artifact Registry, Cloud SQL PostgreSQL with private/approved connectivity, Secret Manager, Cloud Monitoring/Logging/alerts, scaling limits, IAM and Workload Identity Federation.
- Explicit invoker policy: keep private by default; public access requires an approved architecture and authentication plan.
- Test startup, readiness, IAM invoker, database connectivity, secret retrieval, rollout and rollback.
- Verify Cloud Run ingress/health behavior and cloud billing/capacity constraints.

Cloud workflows must validate required project IDs, regions, service names, role permissions, secrets, and pre-existing resources before deploying. Never print secret values. Detect deployment drift and fail safely. Make environment promotion/manual approvals explicit. Do not imply that a GitHub workflow provisions infrastructure if it only deploys a container to pre-provisioned resources.

The frontend is a separate deployable concern. Choose and document an appropriate host (e.g., controlled static hosting with CDN or an approved app service), production auth configuration, API base URL, CORS/cookie/CSRF behavior, HTTPS, and routing. Test the full end-to-end browser→frontend→gateway→API→database flow in staging, not only the API container.

### Phase 7 — KPI and performance validation

Use `docs/engineering/kpi-benchmarking-rules.md` as the starting scorecard. First validate the definitions and adjust targets with the client; then measure, record and compare. Do not edit a failing target merely to make a build pass.

Create repeatable, synthetic-data load tests with:
- Warm-up, steady-state, ramp, burst, soak, DB pressure, restart/scale, dependency timeout and failure scenarios.
- Separate scenarios for ordinary API, auth, workflow, file/document, reports and LLM calls.
- At least 10,000 representative calls per primary endpoint class when appropriate for stable percentile analysis, or a documented statistically justified sample.
- Throughput, p50/p95/p99, errors/timeouts, CPU, RSS/cgroup memory, disk and DB storage growth, DB pool saturation, connection and query latency, autoscaling, restart/OOM, network egress, LLM cost/latency and queue depth if applicable.
- Three repeat runs for critical scenarios; record median, worst run and variance.
- A report containing commit SHA, image digest, OS/runtime, cloud region/instance profile, dataset size, concurrency/rate, test tools, raw outputs, measured result, target, pass/fail, limitations, and owner.

Do not declare SLOs met based only on unit tests, a dashboard screenshot, small samples, CI timing, or guessed hardware values. Separate laptop, CI, staging and production measurements. Define the availability denominator and exclusions.

### Phase 8 — Definition of Done

Do not finish until the following have been addressed or clearly marked blocked with named prerequisites:

- The runner has an unambiguous config contract and tested local/cloud entrypoints.
- The local install/start/stop steps are accurate for Windows and macOS/Linux and are tested or explicitly labeled untested.
- The HTML dashboard route and its metrics API work in each documented local mode; access policy and dynamic output are tested.
- Unit/integration/security tests cover new behavior and known defects have regression tests.
- CI passes on the final commit. Include the exact link and final result.
- Container build passes and image provenance/scan results are available.
- Cloud workflows have been validated against IaC and a staging environment where credentials exist. If no cloud account or secrets are available, report “not deployed,” provide validated configuration requirements, and do not pretend otherwise.
- Measured KPIs are stored as artifacts, distinct from target KPIs.
- Production blockers have owners, risk disposition, and evidence. No critical/high security issue is silently waived.
- README/runbooks document local setup, API/dashboard endpoints, environment variables, remote access boundaries, cloud prerequisites, rollback, backup restore, on-call monitoring, and troubleshooting.
- Prepare a reviewable PR. Do not merge or deploy without explicit authorization.

### Execution instructions

Start now. Inspect the repository and existing tests before changing code. Then implement the smallest coherent set of high-value fixes in phases. Keep unrelated refactors out of scope. For each phase, report: files changed, defect fixed, test added, command run, result, evidence link, and remaining blocker. If CI fails, inspect its logs, fix the cause, and rerun. Final response must state which checks actually passed, which were not run, whether any cloud resources were deployed, the exact PR/commit links, and the top remaining production gates.

---

## End prompt

The prompt is intentionally evidence-driven: it asks Qwen Coder to debug and implement, while preventing it from mistaking architecture documentation or green unit tests for production certification.
