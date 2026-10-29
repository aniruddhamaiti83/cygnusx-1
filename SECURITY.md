# Security policy

## Reporting a vulnerability

Do not report security vulnerabilities in public issues or pull-request comments. Contact the repository owner through GitHub's private vulnerability reporting feature if enabled, or use GitHub's security contact mechanism for this repository. Include a concise description, impact, reproduction steps, affected commit/version, and any suggested mitigation. Do not include real borrower records, secrets, full credit reports, tax IDs, or account numbers.

This project is a prototype and does not currently make a production-security or regulatory-compliance guarantee. Do not use it to store or process real borrower/customer information unless the lender's security, privacy, legal and compliance owners have approved the deployment.

## Supported versions

Security fixes are intended for the current default branch and actively maintained pull requests. There is no separate enterprise support or guaranteed patch SLA.

## Safe development rules

- Never commit .env, private keys, access tokens, production database dumps, borrower files, or provider credentials.
- Use synthetic data in local development and CI.
- Keep dashboard/operations endpoints private; use a distinct high-entropy dashboard token in production.
- Use managed secret storage and short-lived workload identity/OIDC for cloud deployment.
- Do not expose a laptop development server directly to the public internet.
- Treat uploaded documents, retrieved content and LLM output as untrusted input.
- Require human review for credit decisions and exceptions; agents are decision support only.
- Before production, complete the rollout gates in docs/compliance/control-matrix.md and deploy/README.md.
