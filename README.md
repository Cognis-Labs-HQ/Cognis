# Cognis

Cognis is an API-first, modular language-learning and social platform scaffold.

## Current scaffold
- `core/`: contracts, gateway interfaces, and core services.
- `api/`: `/api/v1` route skeleton expressing domain intent and docs endpoints.
- `adapters/`: backend-specific gateway implementations.
- `ui/`: frontend root directory (to be implemented).
- `modules/`: compile-time module root.
- `tooling/cli/`: `cognisctl` placeholder utility.
- `docs/components/`: centralized component docs consumable from UI via API.

## Design principle
API handlers define **what** to do. Gateways/adapters decide **how** to execute backend-specific behavior.

## CI/CD
- GitHub Actions:
  - CI tests on push/pull request.
  - Docker build+push on release publish or manual dispatch to `ghcr.io/<owner>/cognis`.
- GitLab CI:
  - Tests on branch and tag commits.
  - Docker build+push on tags or manual runs to `registry.gitlab.firehawk-systems.com/firehawk/cognis`.


## Container orchestration
- `docker-compose.yml`: production-like run profile (`NODE_ENV=production`, `COGNIS_UI_DEMO_MODE=0`).
- `docker-compose.dev.yaml`: development/demo profile (`NODE_ENV=development`, `COGNIS_UI_DEMO_MODE=1`) with bind mounts for in-flight UI/API edits.


## AI guidance
- AI-specific contribution reminders are isolated in `AI_GUIDELINES.md` (kept separate from product/user docs).
