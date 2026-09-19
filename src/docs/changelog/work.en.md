# Module UI Providers

**Feature Branch:** work

## External modules can publish browser providers

The external-module bootstrap context now exposes `registerCapabilityProvider`, allowing module-owned browser gateways to enter the UI provider catalog. Provider registrations are tied to the module lifecycle and are removed when the module is disabled, refreshed, or fails to bootstrap.

## Commits

- [1213125](https://github.com/Cognis-Labs-HQ/Cognis/commit/121312516048ee5d51bfa6f378cd363264d668bb)
