# Regulatory and operational control matrix

This matrix is an engineering backlog and evidence checklist, **not a legal compliance attestation**. Applicability depends on lender type, loan program, transaction, jurisdiction, data providers and effective dates. Assign a named business/compliance owner before production.

| Domain | Control objective | Product/system evidence | Initial rollout status / required action |
| --- | --- | --- | --- |
| SBA program eligibility | Apply the current SOP and lender policy with effective-dated rules | Rule ID/version, source URL, decision trace, checklist, exception record | **Manual control required:** establish policy owner and validate current SOP/forms before each release |
| Creditworthiness / repayment | Document sound commercial credit analysis and repayment ability | Financial periods, cash flow, assumptions, DSCR and sensitivity calculation, credit memo | **Partial:** validate formula correctness, source reconciliation, independent underwriting test cases |
| Credit elsewhere | Support required determination with actual facts | Evidence items, rationale, date, reviewer, submission certification | **Manual control required:** lender compliance/credit to approve required methodology |
| Borrower identity / KYB | Verify relevant individuals, entity, ownership and authority | Provider result, timestamp, source/reference, exception workflow | **Not production-ready unless provider integration is configured:** no heuristic match is proof of identity |
| BSA/AML / CIP/CDD / sanctions | Apply controls required for the actual institution and transaction | Policy, screening provider, match disposition, escalation/audit record | **Applicability review required:** identify regulated entity/control owner and connect approved services |
| Consumer/commercial credit reports | Lawful access and use; protect report data | Authorization/permissible-purpose record, vendor response, access log | **Manual control / integration required:** do not fabricate bureau results; confirm FCRA and contractual requirements |
| ECOA / Regulation B | Fair lending, appropriate application handling and notices | Decision rationale, policy versions, review log, applicable notices | **Manual control required:** compliance review, testing and adverse-action workflow assessment |
| CFPB Section 1071 | Determine whether rule applies and which provisions/date govern | Applicability memo, data dictionary, access controls/firewall, retention/reporting process | **Counsel-owned:** verify current rule, litigation/stays, institution/product coverage and effective date |
| Privacy / records | Minimize data, control access, retention and legal holds | Data inventory, role matrix, audit log, retention schedule, deletion evidence | **Gap to close:** approve retention schedule and data subject/incident procedures |
| Application/API security | Authenticate and authorize each action and record | Threat model, access tests, rate-limit tests, security logs | **Gap to close before borrower traffic:** comprehensive authorization tests, CSRF review, abuse controls |
| Document safety | Prevent malicious uploads and prompt injection | File allowlist/limits, malware scan, content extraction logs, prompt-injection tests | **Gap to close before external documents:** quarantine/scanning and safe parsing |
| Agent/model governance | Human accountability, traceability, reproducibility, bias and reliability monitoring | Model/provider version, prompt/rule version, evidence IDs, agent output, reviewer override | **Partial/manual:** define validation set, drift/bias tests, rollback and incident thresholds |
| Collateral/perfection | Verify value, ownership, liens, insurance and required environmental checks | Valuation and date, title/lien search, instrument, filing/recording confirmation | **Manual control required:** integrate approved providers and post-closing verification |
| Closing/funding | Only fund approved terms after conditions and required documents | Condition checklist, dual release approval, settlement ledger, proof of payment | **Gap to close:** independent funding authorization and reconciliation test |
| Servicing/liquidation | Monitor payment, covenants, collateral, modifications and recovery actions | Loan boarding, alert history, approvals, recovery/loss ledger | **Manual control required:** confirm servicing workflow against current SOP 50 57 and lender procedures |
| Secrets/cryptography | Keep credentials out of code/logs and rotate them | Secret manager references, rotation log, TLS configuration | **Deployment prerequisite:** cloud secret manager, TLS, rotation and access review |
| Resilience/operations | Recover from failures and detect incidents | SLOs, dashboards, alert rules, backup/PITR restore report, incident runbook | **Gap to close:** durable fleet-wide monitoring, restore drill, load/penetration tests |
| CI/CD supply chain | Block unsafe changes and preserve deployment traceability | Required checks, dependency/image scan, SBOM/provenance, protected environment approvals | **Partial:** CI and image build exist; add scanning and branch/environment protections in repo settings |

## Required evidence model for every material decision

Store, at minimum where legally permitted and operationally necessary:

- Application and party IDs (avoid unnecessary PII in logs).
- Requirement/rule ID, source, version and effective date.
- Evidence ID, origin/provider, collected-at time, applicable period, freshness and integrity/hash where appropriate.
- Computation inputs, units, formulas/version, assumptions and outputs.
- Agent/model/provider identifier, prompt/ruleset version and validation result.
- Decision-maker identity/role, decision, rationale, conditions, exceptions and override.
- State transition, timestamp, actor, request/correlation ID and previous/new state.
- Retention classification, access events and legal hold where applicable.

Never put full credit reports, tax IDs, account numbers, passwords, session tokens or raw borrower documents into application logs or public telemetry.

## Suggested delivery gates

### Before local development
- Use synthetic data only.
- Keep local ports bound to loopback unless intentionally testing container networking.
- Do not commit `.env`, provider keys, production data or generated database files.

### Before shared QA
- Establish managed PostgreSQL and reviewed, versioned migrations.
- Turn on real authentication and record-level authorization; test every route for cross-user access.
- Add rate limiting, abuse controls, audit trail and data deletion/retention behavior.
- Test backup restoration and central logs/alerts.

### Before any production borrower data
- Written approval from lender credit, compliance, security, privacy and legal owners.
- Confirm current SBA SOP, applicable lender requirements and program forms.
- Complete threat model, independent penetration test, dependency/container scanning and load test.
- Prove human approval gates, evidence provenance, fair-lending review, adverse-action workflow where applicable, and controlled disbursement.
- Complete incident response, disaster recovery and operational readiness reviews.
