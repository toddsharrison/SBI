# Space Charts Platform – Draft Architecture

This document captures a strawman architecture for replacing the current PowerBI site with a custom, data-driven web application. We will refine it after the requirements questionnaire is complete.

## Goals
- Deliver rich, highly stylized charts with fine-grained control over the presentation layer.
- Automate data refreshes from authoritative SQL sources with transparent transformation logic.
- Provide a foundation that supports authentication, auditing, and future growth.

## High-level Components
1. **Front-end Web App**
   - Framework: React + Next.js (SSR for SEO and fast first paint).
   - Styling: TailwindCSS plus custom theming for NASA/AEI branding.
   - Charting: D3.js for bespoke visuals plus Plotly/ECharts wrappers where declarative interactions suffice.
   - State/Data fetching: React Query to manage caching, background refresh, and loading/error states.
   - Internationalization & accessibility baked into components from the start.

2. **Backend API Layer**
   - FastAPI (Python) exposing REST endpoints at `/api/charts/<chart_id>` and `/api/filters/...`.
   - Pydantic models provide validation and documentation (OpenAPI schema).
   - Authentication middleware that integrates with NASA SSO (OAuth/OpenID Connect) once requirements are clear.
   - Rate limiting + structured logging via Starlette middleware.

3. **Data Processing & Storage**
   - Core data warehouse in PostgreSQL (could leverage existing NASA infrastructure or RDS/Aurora).
   - dbt models materialize curated schemas for each chart/dashboard.
   - Orchestration handled by Prefect Cloud (or self-hosted) to schedule ingestion + dbt runs.
   - Optional Redis layer for caching frequently requested aggregates.

4. **Infrastructure & Deployment**
   - Docker images for both front-end and backend services.
   - CI/CD (GitHub Actions) handles lint/test/build, publishes images to a container registry.
   - Production deployment via managed Kubernetes (EKS/GKE) or container app platform (Render/Fly.io) depending on compliance constraints.
   - Front-end served behind a CDN (CloudFront/Akamai) with edge caching.
   - Infrastructure-as-Code via Terraform to document and reproduce environments.

5. **Observability & Ops**
   - Centralized logging (ELK/OpenSearch stack).
   - Metrics and tracing via Prometheus + Grafana or OpenTelemetry vendor.
   - Alerting on failed data flows, API latency, and front-end errors (Sentry/New Relic).

## Security Considerations
- Secrets management via AWS Secrets Manager or Vault; never commit credentials.
- Role-based access for APIs (admin vs. viewer) and row-level security enforced in SQL when necessary.
- Automated dependency scanning (Dependabot/Snyk) integrated with CI.

## Open Questions
- Final hosting environment (agency-managed vs. commercial cloud).
- Need for offline/air-gapped deployments.
- Volume of users/concurrent sessions to size infrastructure appropriately.

## Next Steps
1. Fill out the discovery questionnaire (`requirements-discovery.md`).
2. Validate technology choices with stakeholders/IT security.
3. Prototype a thin vertical slice: one dataset surfaced via FastAPI and rendered by a Next.js component.
4. Stand up CI basics (linting + formatting) in this repository.

This document will evolve as we gather more detailed requirements and proof-of-concept results.
