# Cloud deployment guide

This repository provides a manual Cloud Run API deployment workflow at
`.github/workflows/deploy-cloud-run.yml`. It builds and pushes the backend
container and deploys to a **private** Cloud Run service. The workflow assumes
your GCP project already has an Artifact Registry Docker repository named
`cygnusx1`, a PostgreSQL instance, and Secret Manager entries for the database
URL, application secret, and dashboard token.

## GitHub configuration for Google Cloud

Create GitHub environment `production` and configure:

**Secrets**
- `GCP_WORKLOAD_IDENTITY_PROVIDER`: full Workload Identity Provider resource name.
- `GCP_DEPLOY_SERVICE_ACCOUNT`: service account email allowed to deploy.

**Variables**
- `GCP_PROJECT_ID`
- `DATABASE_URL_SECRET`: Secret Manager secret resource name/version alias; workflow appends `:latest`.
- `SECRET_KEY_SECRET`
- `DASHBOARD_TOKEN_SECRET`
- `CORS_ORIGINS`: explicit comma-separated browser origins; never wildcard when cookies are used.

The deploy service account needs least-privilege permissions for Cloud Run deployment,
Artifact Registry writes, and access to the referenced secrets. Configure Workload
Identity Federation rather than storing a long-lived service-account key.

The workflow intentionally uses `--no-allow-unauthenticated`: configure Cloud Run IAM
invoker access or put a supported identity-aware gateway in front of it. A public
consumer-facing SPA may need an intentional different policy. Keep the metrics token
separate from application/session secrets.

## AWS

The API container can also run on ECS Fargate. Create an ECR repository, ECS cluster,
task definition/service, an Application Load Balancer with HTTPS, and an RDS PostgreSQL
instance first. Store `DATABASE_URL`, `SECRET_KEY`, and `DASHBOARD_TOKEN` in AWS
Secrets Manager, reference them as ECS task-definition secrets, and use GitHub OIDC
for deployment credentials. Allow inbound traffic only through the load balancer;
keep RDS in private subnets. Add CloudWatch metrics/log retention and alarms.

No cloud infrastructure was created by this repository change. Cloud deployments
require your account, network, IAM, database, secret and DNS configuration.

## Production rollout gates

Before enabling customer traffic, migrate schema explicitly, enforce rate limits on
authentication and public intake routes, replace phone-last-four/email matching with
a real verified-email challenge, review all authorization and audit events, enable TLS,
backups and tested point-in-time recovery, run dependency/container/image scanning, add
load and penetration tests, and agree numerical service-level objectives with the client.
