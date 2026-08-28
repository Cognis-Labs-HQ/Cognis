# Runtime State Fix

**Feature Branch:** feature-fix-missing-database-relations-error

## Gateway states now have a database table

Cognis now creates the persisted gateway-state table during database initialization and defensively ensures it exists before runtime state restoration reads from it. This prevents PostgreSQL startup logs from reporting that the `gateways` relation does not exist.

## Registration invites initialize their schema before reads

The invite registration adapter now ensures its token tables exist before listing, issuing, or revoking invites, so administration invite pages can query invite state on a fresh database without missing-table errors.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e68cb5a51f989982b2cea69cb48496fffd9061ee
