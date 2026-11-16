# Enterprise KPI Benchmarking Rules and Acceptance Targets

**Status:** Proposed engineering baseline; targets require confirmation by the client product owner, security team, SRE/operations, and lender compliance owner.  
**Application:** CygnusX-1, a loan-origination workflow prototype with a React/Vite frontend, FastAPI API, SQL database, and optional LLM/agent orchestration.

## 1. Purpose and measurement rules

This document defines measurable project outcomes, service-level objectives (SLOs), resource budgets, language-specific quality measures, operating-system coverage, CI/CD gates, and acceptance criteria.

These are **target values, not measured performance claims**. Do not mark an SLO as met until a repeatable test or production telemetry demonstrates it in the intended environment. Capture the test date, commit SHA, environment, workload, sample size, test tool, raw result, and owner for each result. Use synthetic borrower data in tests.

### Measurement policy

1. Keep separate baselines for a developer laptop, CI runner, pre-production load test, and production. Do not compare their numbers as if the hardware and network were equivalent.
2. Report latency at p50, p95, and p99, not just averages. Include request counts and confidence/sample-window context. Separate ordinary API calls from uploads, reports, external integrations, and LLM calls.
3. Define every denominator. For example, API error rate means 5xx responses divided by all eligible API responses; do not count health probes as business traffic.
4. Collect durable, fleet-wide cloud metrics through CloudWatch or Google Cloud Monitoring and centralized logs/traces. The current in-memory dashboard is process-local, bounded, and resets on restart; it is useful for local smoke tests but is not the source of record for a production SLO.
5. Publish an SLO status as **Not measured**, **Pass**, **At risk**, or **Fail**. A green dashboard without adequate traffic or test coverage is not evidence of passing.
6. Agree service objectives, escalation policy, and exclusions with the client before production. Do not tune targets after a failed test without documenting the decision and rerunning the test.

## 2. Project output goals and KPIs

| Area | KPI / definition | Proposed acceptance target | Evidence / source |
|---|---|---|---|
| Core workflow | Approved, in-scope lifecycle scenarios that pass end-to-end tests | 100% of agreed release-critical scenarios | Versioned test plan and CI report |
| Workflow correctness | Release-critical acceptance tests passing | 100% | CI artifacts linked to commit SHA |
| Human authority | Credit/eligibility/approval transitions that bypass required human authority | 0 | Authorization tests, event audit, negative tests |
| Evidence completeness | Required workflow actions with actor, timestamp, outcome, correlation ID, and evidence reference | 100% for controlled actions before go-live | Audit completeness report |
| Data ownership | Cross-user attempts to read or mutate another user's protected record that succeed | 0 | Automated authorization/tenant-isolation tests |
| Reproducibility | Release can be built from a clean checkout with declared dependencies | 100% of release builds | CI build manifest and artifact digest |
| Deployment reliability | Successful deployments / attempted deployments, rolling 30 days | At least 98%; do not waive failed health checks | Deployment history |
| Recovery | Recovery time objective (RTO) | Initial proposal: 4 hours; client to approve | Timed restore/failover exercise |
| Data loss | Recovery point objective (RPO) | Initial proposal: 15 minutes for production database; client to approve | Backup/PITR configuration and restore evidence |
| Incident response | Time to acknowledge a production severity-1 incident | 15 minutes or better, subject to staffed support agreement | On-call records |
| Rollback | Rollback to last known good version | 15 minutes or better in a rehearsal | Deployment runbook and measured drill |
| User experience | Critical UI user journeys complete without unhandled errors | At least 99.5% in synthetic monitoring | Browser automation / real-user monitoring |
| Audit and retention | Events subject to retention policy remain queryable for the approved retention period | 100% verified by scheduled audit | Retention configuration and sample retrieval |

Lifecycle completeness and regulated-process decisions must be signed off by the product owner and lender compliance/legal functions. A software test cannot by itself establish SBA program compliance, fair lending compliance, eligibility, creditworthiness, or legal sufficiency.

## 3. Proposed service SLOs

Use these targets for initial load-test planning, then calibrate against agreed workload, external dependencies, and client risk tolerance.

| KPI | Initial target | Warning threshold | Fail threshold | Measurement |
|---|---:|---:|---:|---|
| Monthly availability for critical API | 99.9% | Below 99.95% forecast | Below 99.9% for agreed window | Cloud uptime / synthetic probes |
| Ordinary API latency, p50 | 100 ms or less | Above 150 ms | Above 250 ms | Server-side histogram |
| Ordinary API latency, p95 | 300 ms or less | Above 400 ms | Above 500 ms | Server-side histogram under agreed load |
| Ordinary API latency, p99 | 1,000 ms or less | Above 1,200 ms | Above 2,000 ms | Server-side histogram under agreed load |
| HTTP 5xx rate | Below 0.1% | 0.1%–0.5% | Above 0.5% for 5 minutes | Gateway / API metrics |
| Unhandled API exception rate | 0 in release-critical tests | Any occurrence | Any repeated occurrence in production | Structured error logs |
| Readiness probe | 99.9% successful once warmed | Intermittent failures | Sustained failure for 2 minutes | External probe |
| Database connection latency | p95 below 100 ms in same-region cloud setup | Above 150 ms | Above 250 ms | DB client / cloud metrics |
| Authentication and authorization | 100% of expected allow/deny cases pass | Any missing negative test | Any unauthorized access succeeds | Security test suite |
| Dashboard refresh | 5 seconds locally; configurable in cloud | Stale for more than 30 seconds | Metrics unavailable for more than 5 minutes without alert | Browser probe and monitoring |
| API startup | Ready within 60 seconds after deployment for the tested profile | 60–120 seconds | Above 120 seconds or readiness never succeeds | Deployment events |
| Cloud service saturation | CPU average below 70%; memory below 75% of limit during steady state | CPU above 70% or memory above 75% for 10 minutes | CPU above 90% or memory above 90% sustained, restarts, or OOM | Cloud metrics |

**Latency scope:** Exclude calls whose time is dominated by an external bureau, identity provider, document processing service, or LLM from the ordinary API SLO. Track each dependency separately. Do not claim a p95 target from a tiny sample: run at least 10,000 representative requests per primary endpoint class for baseline tests, or use a statistically justified sample agreed by performance engineering.

## 4. Compute, memory, storage, and network KPIs

### Local developer laptop profile

| Resource | Minimum for API + frontend + database | Recommended for a realistic local integration loop | Rule |
|---|---|---|---|
| CPU | 4 logical cores | 8 logical cores or more | Normal development CPU below 80%; short build spikes may be higher |
| System RAM | 16 GB | 32 GB if running Docker plus a local LLM | Keep at least 20% RAM available after startup; avoid sustained paging |
| API process RSS | Establish baseline first | Target below 1.0 GiB for ordinary non-LLM service work | Alert on sustained growth above 25% over a stable baseline |
| Container memory | 2 GiB API test allocation as a starting point | Tune after load test; LLM has a separate budget | No OOM kills; retain at least 25% headroom |
| Free disk | 10 GB free before installation | 20 GB or more when building images and retaining logs | Stop before free disk drops below 15% |
| Repository + build artifacts | Record measured size | Keep generated artifacts, caches, and local data out of Git | Track release image and dependency growth |
| Local database | Synthetic data only | Docker PostgreSQL for integration testing | Measure database file/volume growth; verify backup/restore flow |
| Network | Loopback for single-user development | Stable network for remote dependencies | Measure DNS, database, and external API latency separately |

These are practical starting points, not hard hardware requirements for every developer. Measure the application without a local LLM first, then test the optional model separately. Local CPU/RAM/disk readings describe the developer machine, not the cloud service.

### Cloud sizing and operating thresholds

| KPI | Initial sizing / target | Required action |
|---|---|---|
| API CPU/memory | Start with 1 vCPU and 1–2 GiB per API instance as a test profile, not a final production commitment | Run load tests and right-size with 30% or more peak headroom |
| Autoscaling | Scale on CPU, concurrency, and latency signals; cap maximum instances based on database and cost capacity | Test cold starts, scale-out, scale-in, and rate limits |
| Database | Managed PostgreSQL in the same region/VPC or equivalent private network | Agree connection-pool size and max connections before increasing API replicas |
| Disk/storage | Managed durable database storage; object storage for uploaded artifacts where appropriate | Encryption, lifecycle policies, versioning/retention, quotas, and restore test |
| Storage headroom | At least 30% free capacity or enough for the agreed growth window, whichever is stricter | Alert when below 30%; block ingestion or scale storage before exhaustion |
| Database capacity | Connection usage below 70% of configured maximum in normal steady state | Alert above 80%; load-test failover and pool saturation |
| Network egress | Track bytes, external dependency timeouts, retry rate, and cost per workflow | Set budgets and alert thresholds; prevent unbounded retry loops |
| Logging | Structured logs with correlation IDs and redaction | Never log borrower PII, secrets, full request bodies, credit reports, or tax IDs |
| Metrics retention | Set by client SRE/security policy | Export to durable monitoring; do not depend on in-memory process samples |
| Backup/restore | Encrypted backups with point-in-time recovery where supported | Automate backup checks and conduct a timed restore drill at agreed intervals |

The current in-process CPU, RSS, disk, HTTP request, and database metrics are diagnostic. They do not include all container/host cgroup limits and are not a replacement for cloud-provider telemetry. Resource figures may be unavailable or container-relative depending on the runtime; verify the interpretation before using them as a capacity guarantee.

## 5. API, database, and agent/LLM KPIs

| Component | KPI | Initial target / acceptance rule |
|---|---|---|
| API | Request IDs / trace correlation | 100% of handled requests receive a non-sensitive correlation ID |
| API | Input validation | Invalid input is rejected with a controlled 4xx response; no stack traces in client response |
| API | Timeouts | Every remote call has explicit connect/read/total timeout and bounded retries |
| API | Rate limiting | Defined limits on auth, public intake, uploads, and expensive agent routes before production |
| Database | Schema management | Reviewed, versioned migrations; no unreviewed production schema mutation at application startup |
| Database | Query performance | Critical query p95 below 100 ms in benchmark dataset, excluding network and intentionally long reports |
| Database | Pool management | Pool exhaustion tested; effective connection budget stays below database max connections with safety margin |
| Database | Integrity | Zero orphaned or inconsistent records in release acceptance and reconciliation tests |
| Agent workflow | Tool execution | 100% of required tool allow/deny and schema-validation cases pass |
| Agent workflow | Provenance / grounding | Every material generated claim has a source/evidence reference where the workflow requires one |
| Agent workflow | Unsupported output | Measure with a lender-approved evaluation set; proposed initial ceiling of 2%, with zero tolerance for an agent silently approving or rejecting a loan |
| Agent workflow | LLM latency | Track each provider/model separately; use an initial p95 budget of 15 seconds per normal generation call and refine by model/workload |
| Agent workflow | LLM availability | Track timeout, refusal, rate-limit, malformed-output, and provider failure rates separately from API errors |
| Agent workflow | Fallback | Fallback is explicit in UI/API and audit record; heuristic output is never represented as verified credit, eligibility, identity, or underwriting evidence |
| Agent workflow | Human approvals | No release-critical state transition bypasses a required human decision or dual-control gate |
| File/document flow | Upload safety | Enforce type, size, content sniffing, malware scanning, safe parsing, and quarantine rules before processing |
| File/document flow | Sensitive output | No raw tax ID, credit report, session secret, or access token in logs, metrics, error text, or frontend storage |

LLM quality must be assessed on a version-controlled evaluation set that reflects the client's actual workflows and known failure modes. Report results by use case, not only as a single aggregate percentage. A model evaluation score is not an eligibility determination or a guarantee that a model will never hallucinate.

## 6. Coding-language quality KPIs

### Python / FastAPI backend

| KPI | Proposed target | Gate |
|---|---:|---|
| Unit test coverage, all backend statements/branches | At least 85% statement coverage and 75% branch coverage as an initial baseline | Report trend; enforce higher coverage for critical modules |
| Security-critical code coverage | At least 95% of agreed authorization, session, record ownership, and secret-handling paths covered by tests | No go-live until the approved critical-path test set is complete |
| Type checking | No errors in agreed strict modules; progressively tighten the repository baseline | CI is required |
| Lint / formatting | Zero new lint errors; deterministic formatter/linter versions | CI is required |
| Complexity | Cyclomatic complexity target of 10 or less per routine; exceptions documented and reviewed | Refactor or justify higher complexity |
| Error handling | No swallowed exceptions on a critical path; controlled errors and useful sanitized server telemetry | Negative-path tests required |
| Dependency health | No known exploitable critical vulnerabilities; high findings fixed or formally risk-accepted within the client's SLA | Automated dependency scan and exception register |
| API contract | OpenAPI changes reviewed; compatibility tests for supported clients | Breaking changes require versioning or migration plan |
| Secrets | Zero committed secrets or credentials | Secret scan on pull request and repository history |
| Database changes | 100% of production changes represented by reviewed/versioned migrations | Migration up/down or forward-recovery test as appropriate |

### TypeScript / React frontend

| KPI | Proposed target | Gate |
|---|---:|---|
| TypeScript | Zero typecheck errors; avoid adding new implicit any / unsafe casts without explanation | CI is required |
| Lint | Zero new lint errors or unexplained suppressions | CI is required |
| Unit/component tests | At least 85% statement coverage overall after the baseline is instrumented; critical auth/session flows fully covered by scenario tests | CI plus browser-level tests |
| Browser errors | Zero unhandled runtime errors in critical user journeys | Browser smoke test |
| Accessibility | WCAG 2.2 AA as a target for agreed user flows; run automated checks plus manual keyboard/screen-reader testing | Accessibility review before client release |
| Bundle weight | Record current bundle baseline; prevent unreviewed increases above 10% for the same entrypoint | CI artifact comparison |
| User-facing auth | Production identity provider enabled and tested; no development fallback or mock identity in production | Deployment gate |
| Sensitive storage | No bearer/session secrets in localStorage unless explicitly approved by security design; never store borrower secrets in client-side telemetry | Static review and browser security test |

### Cross-language engineering measures

- Require peer review for production-impacting changes and CODEOWNERS review for security, cloud, database, and workflow files.
- Keep critical functions cohesive and small; remove dead code only after confirming there are no dynamic imports or integration references.
- Track defect escape rate, reopened defects, mean time to repair, and change failure rate across releases.
- Add secret scanning, dependency/SBOM generation, container scanning, static analysis, and dynamic security tests. A passing unit suite does not replace these controls.
- Pin dependencies with a reproducible lockfile or constraints process. Use reviewed update automation and document supported runtime versions.

## 7. Operating system and runtime compatibility KPIs

Use the OS matrix that the client agrees to support; version choices below are a proposed starting point and must be updated when vendor support policy changes.

| Environment | Required test coverage | Acceptance target |
|---|---|---|
| Developer Windows 11, PowerShell | Clean clone, virtual environment activation, dependency install, server start/stop, health/readiness, frontend start, path handling | 100% of documented local setup checks pass |
| Developer macOS, current and previous major release supported by the organization | Clean install, permissions, path handling, local server, browser, Docker option | Same documented setup smoke tests pass |
| Linux workstation, supported Ubuntu LTS versions | Clean install, process signals, filesystem permissions, local SQLite and Docker integration | Same documented setup smoke tests pass |
| CI Linux runner | Backend compile/tests, frontend lint/typecheck/tests/build, container build, security scans | Required checks pass on every pull request |
| Container runtime | Non-root user, immutable image tag/digest, healthcheck, signal handling, writable paths limited to required directories | No root runtime, no unexpected writable application paths, graceful shutdown confirmed |
| AWS deployment environment | ECS/Fargate task health, ALB/TLS, IAM least privilege, secrets retrieval, private DB connectivity, CloudWatch metrics | Deployment smoke tests and rollback rehearsal pass |
| Google Cloud deployment environment | Cloud Run readiness, IAM invoker policy, workload identity, Secret Manager, private/approved DB connectivity, Cloud Monitoring | Deployment smoke tests and rollback rehearsal pass |
| Browser clients | Current supported Chrome and Edge; Safari/Firefox where required by client user base | Critical journeys pass on the agreed browser matrix |

Do not use a developer's successful run as evidence of cross-platform support. Automate setup smoke tests where practical and keep operating-system images/runtime versions explicit in CI.

## 8. CI/CD quality gates

A production release pipeline should progress through pull request validation, immutable artifact creation, controlled deployment, smoke tests, and monitored promotion/rollback.

| Stage | Required gate |
|---|---|
| Pull request | Backend tests, frontend lint/typecheck/tests/build, runner configuration smoke test, container build, secret scan |
| Security | Dependency/SCA scan, container image scan, SAST, license policy, IaC scan when IaC is added; no unresolved critical finding |
| Quality | Test coverage trend, API contract review, migration validation, no unapproved suppressions |
| Artifact | Build once and promote the same immutable image digest; generate SBOM and provenance; retain artifact/scan results |
| Identity | GitHub OIDC/workload identity; no long-lived cloud keys stored in repository secrets |
| Environments | Separate development, staging, and production configuration/accounts; explicit approval for production |
| Deploy | Health/readiness checks, schema compatibility, progressive rollout or safe replacement, failure threshold |
| Post-deploy | API/browser smoke tests, error/latency/resource verification, synthetic transactions, deployment annotation |
| Rollback | Documented and tested rollback; database schema changes must support backward compatibility or a verified forward-recovery plan |
| Operational readiness | Alerts, dashboards, escalation ownership, backup/restore evidence, incident runbook, support rota |

**Suggested pipeline targets:** pull-request CI p95 under 10 minutes after caching is tuned; deployment smoke tests under 5 minutes; 100% of releases have an artifact digest, commit SHA, test record, and rollback reference. Treat these as targets to benchmark, not promises about the current pipeline.

Pin GitHub Actions to approved immutable versions/SHA where the organization requires it, review third-party actions, use least-privilege workflow permissions, and keep manual deployment workflows protected by GitHub environment approvals.

## 9. Security, privacy, and regulated-workflow release gates

These are hard blockers rather than performance targets:

- Complete authentication, record-level authorization, tenant isolation, role validation, session expiry/revocation, and audit-event coverage.
- Use real approved identity verification and external provider integrations. Mocks and heuristic fallbacks must be visibly labeled and excluded from real-customer workflows.
- Use reviewed, versioned migrations; do not rely on runtime auto-DDL as the production migration plan.
- Establish encryption in transit/at rest, secret-manager integration, backup/PITR and verified restore, retention/deletion rules, data residency, incident response, and access review.
- Add request/body/response size limits, file safety controls, rate limiting, abuse detection, bounded retries, and dependency timeout policies.
- Obtain lender compliance/legal approval for current SBA rules, forms, effective dates, evidence, notice requirements, fair-lending controls, human approvals, and exception paths.
- Never permit an agent to silently make or execute a final credit decision. Make responsibility, source provenance, human approval, and override history auditable.
- Restrict remote dashboard and operations endpoints behind authentication and authorization; enforce TLS at the gateway. Do not expose a laptop development server directly to the public internet.

## 10. Load-test protocol and scorecard

For each release candidate:

1. Record commit SHA, app version, container digest, DB engine/version, cloud instance shape, region, OS, and exact configuration (excluding secret values).
2. Generate a synthetic dataset that resembles expected record counts, relation depth, file sizes, and workflow mix without using real personal information.
3. Run warm-up, steady-state, burst, soak, dependency failure, database saturation, and scale/restart scenarios. Test ordinary API requests separately from LLM and document tasks.
4. Record throughput, p50/p95/p99 latency, 4xx/5xx rates, CPU, RSS/cgroup memory, restarts/OOMs, disk utilization/growth, DB connections/latency, network egress, LLM token/cost metrics, and queue depth if applicable.
5. Repeat critical tests at least three times and compare median plus worst-run regressions. Define capacity at the point before an SLO or safety margin is violated.
6. Store machine-readable results as CI artifacts and keep a trend by commit. Do not check generated performance output or borrower-like data into Git.
7. Raise a release-blocking issue for any security gate failure, correctness regression, unauthorized access, data loss, OOM/restart loop, sustained SLO violation, or unreviewed material regression.

### Release scorecard template

| KPI | Target | Measured value | Test environment / load | Status | Evidence link | Owner |
|---|---|---|---|---|---|---|
| API p95 latency | 300 ms for ordinary API | Not measured | TBD | Not measured | TBD | API owner |
| API p99 latency | 1,000 ms for ordinary API | Not measured | TBD | Not measured | TBD | API owner |
| HTTP 5xx rate | Below 0.1% | Not measured | TBD | Not measured | TBD | SRE |
| Peak CPU | Below 70% sustained | Not measured | TBD | Not measured | TBD | Platform owner |
| Peak memory | Below 75% of limit | Not measured | TBD | Not measured | TBD | Platform owner |
| Storage headroom | At least 30% | Not measured | TBD | Not measured | TBD | Data owner |
| Authorization negatives | 100% pass; zero unauthorized successes | Not measured | TBD | Not measured | TBD | Security owner |
| CI p95 duration | Under 10 minutes target | Not measured | TBD | Not measured | TBD | DevEx |
| Restore exercise | RTO/RPO approved and met | Not measured | TBD | Not measured | TBD | SRE / data owner |
| Client approval gates | 100% approved before live data | Not measured | TBD | Not measured | TBD | Product / compliance |

## 11. Current repository caveats

At the time this document was added, the repository includes a FastAPI runner, local HTML operations dashboard, bounded in-memory HTTP metrics, basic health/readiness endpoints, backend/frontend CI, container build, and manually triggered AWS ECS and Google Cloud Run deployment workflows.

The repository does **not** thereby become production-ready. In particular:

- Cloud infrastructure, IAM, network boundaries, DNS/TLS, production database, secrets, alarms, backup policy, and frontend hosting still require account-specific provisioning and testing.
- In-memory metrics do not provide durable or fleet-wide performance history.
- Startup schema creation and ad-hoc column additions are not a replacement for reviewed, versioned production migrations.
- The numerical targets above are proposed baselines; no load-test evidence is asserted here.
- The lender must approve requirements, evidence, exceptions, and human decision controls before processing real applicant data.

**Release rule:** No go-live claim may be made until required evidence exists for the agreed SLOs and all security, privacy, compliance, recovery, and operational blockers have an approved disposition.
