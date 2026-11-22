# Token lifecycle enforcement

**Feature Branch:** feature-token-lifecycle-enforcement

## Restricted token lifecycle

Persisted token format 2 requires explicit security fields and rejects unsupported formats, malformed or ambiguous records. Rejected sessions require signing in again; there is no automatic format conversion. Current valid normal, restricted and revoked credentials retain their authority across restart. Token persistence failures are reported rather than acknowledged as successful writes.

## TFA policy changes

All TFA enforcement entry points use the owning policy flow. Disabling enforcement revokes every setup-pending credential, including the acting administrator’s older credentials, while preserving ordinary sessions. Cleanup precedes the policy write and is safe to retry. Missing providers or failed writes return failure; token-file and database writes are not one transaction. A failed policy write can leave the stricter policy with pending credentials already revoked. Local atomic replacement does not guarantee survival of hardware failure or synchronize multiple server processes.

Unrelated settings writes never apply TFA policy. When the TFA read capability exists, system reads and omitted-field writes use its current policy; read failure returns an error instead of reporting disabled enforcement. Without that optional capability, the stored preference is only a mirror and may be stale. Explicit policy changes still require the owner capability.

The policy flow requires a single-use operation and execution state held by its owner. Direct raw-flow calls and captured-operation replay are rejected before mutation; integrations must call the policy capability.

## Isolated Test Credentials

`npm test` and `npm run ci:test` allocate a temporary token-store directory for each run and a separate writable file for every test worker. A static preload sets the file before test modules load, ignoring any inherited production token-store path. Tests may deliberately override their own path afterward for restart or failure cases. The runner removes its temporary directory after successful or failed child execution and forwards ordinary termination signals. Forced process termination or host failure can leave temporary files for operating-system cleanup. Production token persistence remains fail-closed and unchanged.

## Commits

- [71b28b234ca0757f84755cae49d09f942f0f73ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/71b28b234ca0757f84755cae49d09f942f0f73ef)
- [b24c90ba0c3e8a4683bbfcc5179896fda57281c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b24c90ba0c3e8a4683bbfcc5179896fda57281c8)
- [af370270d698d3f55b6939f0727a0ccfb3fa02af](https://github.com/Cognis-Labs-HQ/Cognis/commit/af370270d698d3f55b6939f0727a0ccfb3fa02af)
- [f11e76367a3396faba5abbd2fd1732fa972743a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/f11e76367a3396faba5abbd2fd1732fa972743a1)
