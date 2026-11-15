# User Deletion Outcomes

Deleting an account and finishing its dependent cleanup are separate outcomes. A failed response does not by itself prove that the account remains present.

## Usage examples

Send `DELETE /api/v1/users/:username` with the usual authorized request credentials. A normal response remains HTTP 200 with `{"data":{"deleted":true}}`.

If the deletion was confirmed but a subsequent flow hook failed, the response is HTTP 500 with `{"error":{"code":"user_deletion_cleanup_incomplete"},"data":{"deleted":true,"outcome":"committed","cleanup":"incomplete"}}`. Do not repeat deletion to repair cleanup. Review the server's recorded failure and the affected component's recovery procedure.

## Technical specification

A normally returned flow value must carry the expected flow ID, a data object and the exact captured result-map identity. Missing or malformed completion results remain unknown even if an owner receipt exists. Completion validation is separate from rejected flow promises; local result-processing failures never imply that cleanup failed.

### Confirmed, rejected and unknown

An owner-confirmed refusal returns its 400, 403 or 404 status with its existing safe `error.code` and `error.message`, `data.outcome: rejected`, and `data.deleted: false`. This distinguishes rejection from a partial operation. Checks that reject the request before the deletion flow starts retain their existing response contracts.

A structurally valid completed flow whose bound receipt reader reports unavailable evidence retains HTTP 503 with the existing safe `error.code` and `error.message` both set to `account_policy_unavailable`, adding `data.deleted: null` and `data.outcome: unknown`. This includes policy or lease unavailability and missing, invalid or stale receipts. These indistinguishable cases may occur before or after account deletion, so 503 never establishes rejection or `deleted: false`.

A thrown flow with unconfirmed evidence, a missing or malformed completion result, or a mismatched persisted account/action instead returns HTTP 500 with `error.code: user_deletion_outcome_unknown` and the same null/unknown data. Even a completed flow cannot establish success without a matching authoritative receipt.

A lost or unreadable response leaves the caller's outcome unknown even if the server committed deletion. Verify the account and operational records before deciding what to do next. Absence on a later account lookup alone does not prove which request removed it. No automatic retry or cleanup replay is performed.

### Receipt and recovery boundaries

The API captures the real invocation's result-map identity through a per-run handler before the registered authorization hooks. Existing hooks retain their ordering and execute normally. Only the prebound, current `auth:deprovisionOutcome` reader can confirm an outcome for the original input and exact invocation identity. Public stage values, copied results and another request's receipt cannot establish deletion.

The normal 200 response confirms deletion after the flow returned; it makes no new claim about the completeness of every dependent component's work. A thrown flow with a matching persisted receipt confirms deletion while reporting unfinished cleanup. The API logs a safe failure category, writes one structured response and rethrows the original exception so the existing component-recovery boundary retains its attribution and accounting. Raw exception details are never returned.

### Compatibility

The normal success payload and pre-flow rejection shapes are unchanged. Owner-confirmed 400/403/404 flow refusals preserve their safe error fields and add `data.outcome: rejected`. Valid completed flows with unavailable evidence preserve the existing 503 error fields and add an unknown outcome. Thrown partial/unknown failures and invalid completion results use HTTP 500. Consumers must inspect the explicit outcome, not infer whether deletion occurred from status alone.
