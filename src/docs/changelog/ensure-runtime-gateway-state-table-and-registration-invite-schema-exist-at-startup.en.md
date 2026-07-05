# Runtime State Fix

## Gateway states now have a database table

Cognis now creates the persisted gateway-state table during database initialization and defensively ensures it exists before runtime state restoration reads from it. This prevents PostgreSQL startup logs from reporting that the `gateways` relation does not exist.

## Registration invites initialize their schema before reads

The invite registration adapter now ensures its token tables exist before listing, issuing, or revoking invites, so administration invite pages can query invite state on a fresh database without missing-table errors.
