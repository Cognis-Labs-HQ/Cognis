# Technical Reference

The public interfaces and operational rules of Application Server.

## Interfaces

### Documentation Reader

| Method | Path                                    | Result                                          |
| ------ | --------------------------------------- | ----------------------------------------------- |
| GET    | `/api/v1/docs`                          | Lists documentation bundles and their versions. |
| GET    | `/api/v1/docs/:version/:slug`           | Reads Info from the selected version.           |
| GET    | `/api/v1/docs/:version/:slug/usage`     | Reads Usage from the same version.              |
| GET    | `/api/v1/docs/:version/:slug/technical` | Reads Technical from the same version.          |

`langs` is an ordered language preference; English is the final fallback. The index exposes `slug`, `title`, `group`, `version`, `versions`, `sourceName` and `views`.

The `langs` query is an ordered comma-separated language list for both index titles and document bodies. A regional locale tries its base language before the next preference; English remains available as the mandatory fallback. The same resolution applies to Info, Usage and Technical at the requested component version.

## Configuration

### Documentation Reader

`COGNIS_DOCS_ARCHIVE_DIR` selects the archive directory. Otherwise the archive is beside `COGNIS_CLI_TOKEN_PATH`, or under the user home directory at `.cognis/docs-archive`. The process needs write access to this location.

## Behavior

### Document Diffs

Document diffs let a module explain the differences between two immutable document versions before a user acts on the newer copy.

### Markdown comparison views

Use `renderMarkdownDocumentDiff(diff)` from the browser `ui:documentDiff` capability to render the complete destination document through the host Markdown renderer. Unchanged content keeps its normal document presentation, while additions, replacements, and removals receive green, orange, and red overlays with overview-rail navigation. The renderer processes the composed comparison in one Markdown pass, preserving fenced code blocks, lists, quotations, and other structures that cross changed lines.

### Documentation Reader

All three views and their available translations are saved in one atomic `bundle.json` snapshot under the component version. Only complete bundles are advertised. Re-reading an installed version refreshes its content as one bundle; other published complete versions remain available.

The database input uses the DB gateway’s public structured `ensureTable` and `executeCommand` contract. Store creation and immutable store methods carry explicit TypeScript contracts; they do not require a concrete database driver.

Shared behavior: [TFA](/docs/gateways/tfa/technical).

Unrelated settings writes never apply TFA policy. When the TFA read capability exists, system reads and omitted-field writes use its current policy; read failure returns an error instead of reporting disabled enforcement. Without that optional capability, the stored preference is only a mirror and may be stale. Explicit policy changes still require the owner capability.

Account guards now accept only session-purpose credentials. A mixed resource route must explicitly obtain `share:getGuestClaims(request)`, then apply its resource and capability authorization. Missing or invalid guest admission falls back only to normal account authentication, never to account authorization with guest claims. A module route that performs this complete admission in its handler omits outer account-role metadata; management routes keep it. Only provider and app-route discovery accept live guest credentials for rendering, with existing role visibility filters. The no-store identity endpoint returns only verified subject, role, provider, purpose and setup state.

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`

Docs reads the public manifest in the matching source-root directory. The manifest UUID must match the group and canonical paths must stay inside that owner. Only id, name and ui.stringsBaseUrl plus ui.stringsRevision, a digest of the validated version and sorted published locale-file SHA-256 entries are projected. Configuration, credentials, lifecycle state and administrative catalog data are not part of this response. No additional authentication or administrative endpoint is required.

The shared localizeModulePresentation export in /static/reuse/presentation.js serves Modules and Docs. The existing manifest name key and catalog URL are used without inventing keys. A missing or empty preferred-language value falls back to English. If the English key is also missing or empty, rendering fails with missing_translation instead of showing a key or substitute label.

Archived-only documents receive current presentation metadata while the owning manifest remains available. When metadata is unavailable, the existing identifier label remains; documents, versions and grouping stay accessible. Removing a module does not fabricate or preserve a stale translated name.

The Docs guide still highlights navigation, the current document and version links. Its navigation step explains display-name groups. Collapse preferences remain keyed by stable group ID across navigation; a mount cancelled during translation loading does not publish a menu.

Locale URLs must be canonical paths below /static/modules/{id}/, with nonempty public path segments and no traversal, query, fragment or external origin. Non-string URLs and malformed descriptors are rejected before localization. Installed manifests without a declared URL use the existing /static/modules/{id}/languages route, which the host resolves to the UUID-owned UI directory even before module bootstrap.

Unusable optional manifest JSON, shapes or locale descriptors are omitted with a structured diagnostic containing the group and a safe reason, while valid neighboring documents remain available under their original identities. Unexpected filesystem failures still propagate. This metadata fallback never catches missing declared translation keys.

Version revisions apply to both explicit and conventional catalogs, so a module upgrade refreshes translated labels on the next mount. Page and global search resolve the active display language, even when it differs from saved language priority; background search does not rewrite those preferences.

The content revision also changes when published locale-file hashes change at the same software version. This refreshes labels after updates made outside the current tab without exposing installation state. Undeclared changes to locale bytes require the normal module lifecycle cache invalidation.

Published prerelease version identifiers remain valid for presentation revisions, including archived-only documents. Unrelated published assets, including filenames with spaces or non-Latin characters, do not affect locale validation or the locale digest.

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

## Security

Documentation endpoints publish read-only information. Keep credentials and private account data out of these sources. Routes using the separate document-diff capability enforce their own authentication and document authorization.

## Reference

### Technical Specification

Both hashes must exist in the store namespace and belong to the same document slug. The result contains the source and destination hashes, the shared slug, and ordered lines classified as `unchanged`, `added`, `removed`, or `changed`. Changed entries carry both the previous and replacement text.

The browser renderer escapes dynamic text and presents added lines in green, changed lines in orange, and removed lines in red.
