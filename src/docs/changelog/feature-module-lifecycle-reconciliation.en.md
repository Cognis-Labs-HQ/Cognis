# Module Lifecycle Outcomes

**Feature Branch:** feature-module-lifecycle-reconciliation

## Module Lifecycle Outcomes

Enable and Disable remain busy while the mutation request and any follow-up state check run. A state read establishes the current observed state, not whether this request committed. Leaving Modules does not cancel an already sent mutation, and its old page cannot show late feedback or update a replacement view. Account changes invalidate queued work and late results. A lost response triggers one fresh state read with a five-second deadline, never an automatic mutation retry. If the result remains unknown, Check State replaces lifecycle actions; later reads and SPA visits keep actions locked while the opposite state is observed; actions return only after the requested state is observed. Optional setup guidance and cancelled catalog refreshes cannot turn an acknowledged enable into a rejection. Required configuration cancellation still rolls back once. A lost rollback response is reconciled as disabled only when an authoritative read shows disabled; otherwise its outcome remains unknown.

The marketplace tutorials include Check State only when its enabled control is present, skip ordinary lifecycle actions while their result is unknown, and retain their existing owner and completion IDs. Configuration openings retain their existing popup and tutorial lifetimes. The host Modules page has no independently versioned component package or manifest; no API, Core or optional-provider versions or hashes change.

A reconciled lifecycle event is marked as observed-state, distinct from an acknowledged-response event. An observed state does not prove that this request committed. The API has no durable operation receipt: unresolved client ownership is retained across SPA mounts, not a full browser reload. After a reload only the current server state is available; this change cannot establish the terminal outcome of the earlier request or verify real Study bootstrap.

A module cannot satisfy a dependency while its lifecycle action is pending or its result is unresolved, including disable and setup rollback. Repeated actions and SPA mounts retain this restriction, and queued activations check readiness again when execution begins without repeating an optional-dependency choice. Observed enablement remains separate from completed setup; rejected rollback also leaves setup incomplete. Saving settings can confirm setup but cannot resolve an uncertain mutation. An authoritative expected disabled state permits ordinary explicit enable recovery.

Missing translations for dependency readiness warnings fail explicitly, including on repeated actions, rather than displaying internal error text. The pending button is still restored after the failure.

Settings and update/channel actions use the same account-bound pending and outcome checks, including temporary enable/disable and rollback. Every enable and restoration rechecks selected dependencies. Installation restoration is permitted only after definite submission rejection or an acknowledged terminal job result. Lost submission or status responses and missing job receipts remain unknown, with no restore or retry. An installation with a lost result stays blocked for the page session: Check State refreshes the catalog but cannot establish job completion. A full reload discards this local uncertainty without proving completion; durable job receipts and hard-reload recovery are not added.

## Commits

- [9a0290cfd75a5a56679e3217a5cb5f5825246174](https://github.com/Cognis-Labs-HQ/Cognis/commit/9a0290cfd75a5a56679e3217a5cb5f5825246174)
- [f721c2f72d1d73228f4d1dd2cb7f027e065e27c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/f721c2f72d1d73228f4d1dd2cb7f027e065e27c8)
- [e632fac6ba342fe403c0a2fb4ce82d5a7dde816a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e632fac6ba342fe403c0a2fb4ce82d5a7dde816a)
- [56d32ec39813023e57e3cfcd5b2a05b2ed73fb27](https://github.com/Cognis-Labs-HQ/Cognis/commit/56d32ec39813023e57e3cfcd5b2a05b2ed73fb27)
- [4eb495fdc16c8bf8ae39a8a28d605244dd8a868f](https://github.com/Cognis-Labs-HQ/Cognis/commit/4eb495fdc16c8bf8ae39a8a28d605244dd8a868f)

- [ee4ea4b80851aa7706cea39c29dd97be27575e61](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee4ea4b80851aa7706cea39c29dd97be27575e61)
