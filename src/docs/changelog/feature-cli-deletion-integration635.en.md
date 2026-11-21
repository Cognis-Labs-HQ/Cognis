# Truthful Deletion Results

**Feature Branch:** feature-cli-deletion-integration635

## Distinguish account outcomes

Account deletion distinguishes an owner-confirmed deletion with unfinished cleanup, an authoritative refusal and an unknown result. Normal HTTP 200 remains unchanged. Existing refusal status, code and safe message are preserved; explicit outcome data is added. Genuine flow exceptions retain their original component-recovery attribution.

Completed flows with unavailable evidence preserve the existing HTTP 503 error fields and report a null, unknown deletion outcome, including when deletion may already have occurred. Thrown uncertainty and malformed completion results remain HTTP 500 unknown; no authorization or lease checks are changed.

## Require completed evidence

The CLI requires HTTP 200 and the exact deletion acknowledgement. Other successful statuses and malformed or missing completion results stay unknown. The optional public transport status constraint preserves existing callers by default.

## Explain failures without retry

Partial, refused and unknown outcomes use localized stderr messages and a nonzero exit status. Missing responses never trigger automatic deletion or cleanup retries. German, English, Indonesian and Japanese documentation describes the outcome contract and safe follow-up.

## Commits

- [527633ba4baa68b59e1463f00d1b58deee86b213](https://github.com/Cognis-Labs-HQ/Cognis/commit/527633ba4baa68b59e1463f00d1b58deee86b213)
- [b04149d652f3802afb5e6cfdaa921762c39c4c48](https://github.com/Cognis-Labs-HQ/Cognis/commit/b04149d652f3802afb5e6cfdaa921762c39c4c48)
