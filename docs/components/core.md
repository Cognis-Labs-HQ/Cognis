# Core Component

## Purpose
`core/` holds Cognis domain contracts and orchestration services that must not depend on backend/provider specifics.

## Key contents
- `contracts/module-manifest.ts`: JSON-driven module metadata contract.
- `gateways/*`: integration interfaces for DB, file storage, auth, and module runtime.
- `services/module-service.ts`: core module lifecycle policy checks.
- `services/health-service.ts`: health status abstraction.

## Rules
- Core defines **what must happen**, never **how a provider executes it**.
- No direct imports of DB drivers or external auth SDKs in `core/`.
