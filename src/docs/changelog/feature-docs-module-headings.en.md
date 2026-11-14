# Documentation Groups

**Feature Branch:** feature-docs-module-headings

## Documentation Groups

Open Docs, expand a module group by its display name and choose a page. Modules with the same display name remain separate groups. Search descriptions and searchable text use the same localized names.

Archived-only documents receive current presentation metadata while the owning manifest remains available. When metadata is unavailable, the existing identifier label remains; documents, versions and grouping stay accessible. Removing a module does not fabricate or preserve a stale translated name.

## Technical specification

The shared localizeModulePresentation export in /static/reuse/presentation.js serves Modules and Docs. The existing manifest name key and catalog URL are used without inventing keys. A missing or empty preferred-language value falls back to English. If the English key is also missing or empty, rendering fails with missing_translation instead of showing a key or substitute label.

Locale URLs must be canonical paths below /static/modules/{id}/, with nonempty public path segments and no traversal, query, fragment or external origin. Non-string URLs and malformed descriptors are rejected before localization. Installed manifests without a declared URL use the existing /static/modules/{id}/languages route, which the host resolves to the UUID-owned UI directory even before module bootstrap.

Unusable optional manifest JSON, shapes or locale descriptors are omitted with a structured diagnostic containing the group and a safe reason, while valid neighboring documents remain available under their original identities. Unexpected filesystem failures still propagate. This metadata fallback never catches missing declared translation keys.

Version revisions apply to both explicit and conventional catalogs, so a module upgrade refreshes translated labels on the next mount. Page and global search resolve the active display language, even when it differs from saved language priority; background search does not rewrite those preferences.

The content revision also changes when published locale-file hashes change at the same software version. This refreshes labels after updates made outside the current tab without exposing installation state. Undeclared changes to locale bytes require the normal module lifecycle cache invalidation.

Published prerelease version identifiers remain valid for presentation revisions, including archived-only documents. Unrelated published assets, including filenames with spaces or non-Latin characters, do not affect locale validation or the locale digest.

## Commits

- [335e21ef30f7c02a2c24424d7515c27499c93d85](https://github.com/Cognis-Labs-HQ/Cognis/commit/335e21ef30f7c02a2c24424d7515c27499c93d85)
