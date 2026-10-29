## Summary

What changes and why?

## Validation

- [ ] Backend tests / compile passed
- [ ] Frontend lint, typecheck, tests and build passed
- [ ] Container build passed where relevant
- [ ] Manual smoke test performed where applicable

## Risk and control review

- [ ] No secrets, customer data, credit reports or tax IDs are included
- [ ] Authentication, record-level authorization and audit implications reviewed
- [ ] Database changes include a safe migration and rollback plan
- [ ] Agent/prompt/rule changes preserve evidence provenance and human credit authority
- [ ] SBA policy/form changes include source, effective date and compliance-owner review
- [ ] Logging/metrics avoid raw PII and sensitive document contents
- [ ] Deployment/configuration changes include least-privilege and rollback considerations

## Release impact

- [ ] Documentation/runbooks updated
- [ ] New env vars/secrets documented
- [ ] Known gaps and follow-up work recorded
