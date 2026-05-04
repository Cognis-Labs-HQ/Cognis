# Changelog

All notable changes to Cognis are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Notification gateway with SMTP adapter auto-discovery ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- `VerificationEmailSender` interface; gateway is now the sole authority for verification emails ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Per-provider enable/disable flag persisted through the gateway config store ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Docs auto-discovery: route scans for `docs/` directories anywhere under `src/` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component versioning document at `src/components/docs/versions.en.md` ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- SMTP adapter relocated to `src/adapters/notify/smtp/`; tests co-located inside `tests/` subdirectory ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Fixed

- Translated untranslated page titles and security/email strings in `de`, `id`, and `ja` `strings.xml` files ([7889c64](https://github.com/le-firehawk/Cognis/commit/7889c64))

### Changed

- Prettier 3.8.3 adopted as the canonical code formatter (inferred from IDE auto-format samples): 4-space indent, double quotes, trailing commas in multi-line argument lists ([4f0eab0](https://github.com/le-firehawk/Cognis/commit/4f0eab0))
- `lint-placeholder.mjs` replaced with Prettier `--check` invocation; `lint-readable.mjs` indentation check removed (now covered by Prettier)
- All source files (JS, TS, HTML, CSS) reformatted to match the Prettier standard
- All route files restructured to `routes/<domain>/index.ts` pattern ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Notification gateway renamed from `notification-gateway.ts` to `notifications.ts` (redundant suffix removed) ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))
- Component docs reorganised: `src/docs/components/` → `src/components/docs/`, `src/docs/modules/` → `src/modules/docs/`, `src/docs/standards/` → `src/tooling/docs/`
- AI instructions updated with CHANGELOG, CHANGELOG compression convention, and general gateway/adapter authority principle

### Removed

- `src/docs/foundation-log.md` (internal session log, not product documentation)
- Flat `*-routes.ts` files replaced by domain-subdirectory route handlers ([67c070c](https://github.com/le-firehawk/Cognis/commit/67c070c))

### Fixed

- `dispatch()` in notification gateway now catches per-sender errors rather than propagating ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- Email UNIQUE constraint now enforced in all DB init scripts ([f51b505](https://github.com/le-firehawk/Cognis/commit/f51b505))
- `discoverSenders` now scans `adaptersRoot/notify/` instead of `adaptersRoot/`, correctly resolving the two-level `src/adapters/<gateway-id>/<adapter-id>/` structure

[Unreleased]: https://github.com/le-firehawk/Cognis/compare/HEAD...HEAD
