# AWS ECS deployment prerequisites

Configure the GitHub `production` environment before manually running
`.github/workflows/deploy-aws-ecs.yml`.

Required GitHub secret:
- `AWS_DEPLOY_ROLE_ARN`: an IAM role trusted for this repository/environment through GitHub OIDC.

Required GitHub environment variables:
- `AWS_ACCOUNT_ID`, `AWS_REGION`, `AWS_ECR_REPOSITORY`
- `AWS_ECS_CLUSTER`, `AWS_ECS_SERVICE`
- `ECS_TASK_EXECUTION_ROLE_ARN`, `ECS_TASK_ROLE_ARN`
- `ECS_DATABASE_URL_SECRET_ARN`, `ECS_SECRET_KEY_SECRET_ARN`, `ECS_DASHBOARD_TOKEN_SECRET_ARN`
- `CORS_ORIGINS`

Pre-create the ECR repository, ECS Fargate cluster/service, task execution and task
roles, CloudWatch log group `/ecs/cygnusx1-api`, VPC/subnets/security groups, an
HTTPS Application Load Balancer, and an RDS PostgreSQL database in private subnets.
The task execution role must read the referenced Secrets Manager secrets and write
CloudWatch logs. The task role should have only application-required permissions.

The workflow pushes an immutable commit-tagged image, renders/registers the task
definition, updates ECS and waits for a stable service. Configure HTTPS and ALB
health checks to use `/api/cx1/ready`. Restrict database inbound rules to the task
security group. Use a separate, restricted app role for database access and enable
backups / point-in-time recovery.

This workflow does not create AWS account infrastructure or secrets. Review and
test the IAM trust policy, network layout, deployment rollback, secret rotation,
observability retention, and recovery runbook before using production borrower data.
