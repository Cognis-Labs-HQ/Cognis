# Token lifecycle enforcement

**Feature Branch:** feature-token-lifecycle-enforcement

## Restricted token lifecycle

Persisted token format 2 requires explicit security fields and rejects unsupported formats, malformed or ambiguous records. Rejected sessions require signing in again; there is no automatic format conversion. Current valid normal, restricted and revoked credentials retain their authority across restart. Token persistence failures are reported rather than acknowledged as successful writes.

## TFA policy changes

All TFA enforcement entry points use the owning policy flow. Disabling enforcement revokes every setup-pending credential, including the acting administrator’s older credentials, while preserving ordinary sessions. Cleanup precedes the policy write and is safe to retry. Missing providers or failed writes return failure; token-file and database writes are not one transaction. A failed policy write can leave the stricter policy with pending credentials already revoked. Local atomic replacement does not guarantee survival of hardware failure or synchronize multiple server processes.

Unrelated settings writes never apply TFA policy. When the TFA read capability exists, system reads and omitted-field writes use its current policy; read failure returns an error instead of reporting disabled enforcement. Without that optional capability, the stored preference is only a mirror and may be stale. Explicit policy changes still require the owner capability.

The policy flow requires a single-use operation and execution state held by its owner. Direct raw-flow calls and captured-operation replay are rejected before mutation; integrations must call the policy capability.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3a2f90aa804ed98e3ba72cc10724913cf14bbf84
