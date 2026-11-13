# Token lifecycle enforcement

## Usage Examples

Use the authenticated system security or TFA enforcement endpoint to change mandatory enrollment. A failed policy application returns an error instead of a successful save.

## Technical Specification

All TFA enforcement entry points use the owning policy flow. Disabling enforcement revokes every setup-pending credential, including the acting administrator’s older credentials, while preserving ordinary sessions. Cleanup precedes the policy write and is safe to retry. Missing providers or failed writes return failure; token-file and database writes are not one transaction. A failed policy write can leave the stricter policy with pending credentials already revoked. Local atomic replacement does not guarantee survival of hardware failure or synchronize multiple server processes.

Unrelated settings writes never apply TFA policy. When the TFA read capability exists, system reads and omitted-field writes use its current policy; read failure returns an error instead of reporting disabled enforcement. Without that optional capability, the stored preference is only a mirror and may be stale. Explicit policy changes still require the owner capability.
