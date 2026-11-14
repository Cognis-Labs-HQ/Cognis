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

- [215f842f7e7ce230d29c27c47b40ef12976c2372](https://github.com/Cognis-Labs-HQ/Cognis/commit/215f842f7e7ce230d29c27c47b40ef12976c2372)
- [25a87fd0684de8205bc8310ce0e2cd17397a76b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/25a87fd0684de8205bc8310ce0e2cd17397a76b0)
- [13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9)
- [f7a840d84e9dda280de54dd84e08519ed35a0a13](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7a840d84e9dda280de54dd84e08519ed35a0a13)
- [d66a4fdeccb120a7d39837df821b15e29db48143](https://github.com/Cognis-Labs-HQ/Cognis/commit/d66a4fdeccb120a7d39837df821b15e29db48143)
- [5995ab80c44feb429ec0afd1ad046b76f1834a1e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5995ab80c44feb429ec0afd1ad046b76f1834a1e)
