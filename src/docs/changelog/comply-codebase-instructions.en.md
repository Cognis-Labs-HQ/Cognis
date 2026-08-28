# Compliance And Admin Cleanup

**Feature Branch:** copilot/comply-codebase-instructions

## Consolidate Administration Security

Removed the separate Administration → Authentication section by stopping auth admin section registration. Password policy controls now live directly in Administration → Security, together with trusted domains, registration control, validation mode, and teacher approval controls.

## Reduce Redundant Auth UI Surface

Deleted obsolete auth-specific administration assets that only existed for the removed Authentication section. This reduces maintenance overhead and removes duplicate admin configuration surfaces.

## Add Compliance Guardrail Tests

Added architecture compliance tests that enforce UI/app and API/routes directory conventions, guard against new over-1000-line source files, and prevent new direct core/api-to-gateway coupling outside a constrained grandfathered set.

## Tighten Ctx-First Route Auth Wiring

Updated server and module extension route setup to rely on injected route auth context instead of implicit fallback wiring. Startup now fails fast if auth route context is missing.

## Clarify AI Instruction Priorities

Updated AI instructions to explicitly require LOC discipline, reject large diffs as a quality signal, require generic naming, enforce true reuse boundaries, keep HTML and JS/TS separate, and split oversized files into directory-based entry structures.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/a267b4cce59173b5060e5035a628583868afa39e
