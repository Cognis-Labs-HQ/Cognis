# Core Component

## Purpose
`core/` contains provider-agnostic contracts and services.

## Key domains
- Contracts (`core/src/contracts/*`)
- Gateway interfaces (`core/src/gateways/*`)
- Services (`core/src/services/*`)

## Important rule
```text
Core defines WHAT happens.
Adapters/gateways define HOW it happens.
```

## Current services
- `ModuleService` (module lifecycle policy)
- `HealthService` (status + uptime metadata)
