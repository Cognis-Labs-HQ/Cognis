# Core Component

## Purpose
`core/` contains provider-agnostic contracts and services.

## Key domains
- Contracts (`core/contracts/*`)
- Gateway interfaces (`core/gateways/*`)
- Services (`core/services/*`)

## Important rule
```text
Core defines WHAT happens.
Adapters/gateways define HOW it happens.
```

## Current services
- `ModuleService` (module lifecycle policy)
- `HealthService` (status + uptime metadata)

## Core module capabilities
- `system:health`: exposes platform health and uptime.
- `auth:accounts`: handles built-in account lifecycle and authentication policy wiring.
- `modules:lifecycle`: governs module listing, enable/disable controls, and policy checks.
- `ui:shell`: provides dashboard shell routing and admin operations surface.
