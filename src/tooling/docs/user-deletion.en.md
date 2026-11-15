# CLI Account Deletion

The `user:delete` command reports confirmed deletion, rejection and uncertain outcomes separately. It never automatically repeats a submitted deletion.

## Usage examples

Run `cognisctl user:delete <username>`. The existing interactive username prompt also remains available. A failed preflight lookup stops before DELETE is sent. Ordinary confirmed success prints the existing deletion summary and exits 0.

If the account was deleted but cleanup failed, the command reports that deletion occurred and cleanup remains incomplete. Do not repeat deletion to repair dependent resources; review the server failure and the affected component's recovery procedure. Rejected or uncertain deletion also exits 1. Failure text goes to stderr; no success summary goes to stdout.

## Technical specification

Deletion requires HTTP 200 as well as the exact acknowledgement. Other successful HTTP statuses, including 201, 202 and 207, remain unknown and exit nonzero. The public `apiRequest` option `expectedStatus` restricts accepted successful status for callers that request it; omission preserves existing multi-2xx and progress behavior, and the option does not override HTTP error handling.

### Response evidence

Only the API's exact normal `{data:{deleted:true}}` response is accepted as success. A coherent HTTP 500 `user_deletion_cleanup_incomplete` response with `data.deleted: true`, `data.outcome: committed` and `data.cleanup: incomplete` is reported as committed with incomplete cleanup, not ordinary success.

A coherent owner refusal preserves its existing 400, 403 or 404 code/status combination and adds `data.deleted: false` and `data.outcome: rejected`. Missing, stale or unavailable evidence, malformed or contradictory responses, absent acknowledgements, unreadable JSON and transport failure are unknown. A status or a single `deleted` field does not establish the result. Preflight failures retain their normal diagnostics because no deletion was submitted.

A valid completed flow with unavailable evidence retains HTTP 503 `account_policy_unavailable` and adds `data.deleted: null`, `data.outcome: unknown`. Thrown uncertainty or invalid completion results use HTTP 500 `user_deletion_outcome_unknown`. Both forms remain unknown to the CLI, exit nonzero and never trigger an automatic retry; a 503 response does not prove the account was retained.

Unknown outcomes require checking account state and server records before deciding whether to retry. Losing a request before delivery and losing a response after deletion are indistinguishable to the CLI. A subsequent not-found lookup alone cannot prove which operation removed the account. Repeating the command is a new manual operation, not an automatic recovery step.

### Localization and diagnostics

Outcome text uses the CLI's German, English, Indonesian and Japanese XML catalogs and normal language selection. Missing preferred text falls back to English; absent English text fails explicitly. Raw exception and transport details are not printed as outcome explanations. These rules also apply with verbose output; verbose mode does not turn partial or unknown results into success.
