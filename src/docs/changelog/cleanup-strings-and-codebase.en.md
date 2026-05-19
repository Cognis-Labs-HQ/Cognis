# PR Changelog — String Cleanup

## Summary

Updated changelog filename policy to use the branch name without the
`copilot/` prefix and renamed this changelog entry accordingly.

Aligned changelog documentation links and guidance with the branch-name-based
entry filename convention.

Relocated feature-specific DB store implementations out of `src/adapters/db/reuse/`
into their owning gateways and adapters, following the principle that DB
adapters/gateway must not contain code for other gateways/adapters and that
`reuse/` directories must not exist inside adapter directories.

Updated `.github/copilot-instructions.md` to codify both rules. Also updated
the changelog policy to require entries in all supported app languages (de, en,
id, ja) for every pull request.

Fixed a MariaDB compatibility bug in `ensureTable()`: text columns that appear
as primary or unique keys now use `VARCHAR(255)` instead of `TEXT`, which
MariaDB requires when a TEXT column is used in an index or key constraint.

## Changed components and files

- AI contribution instructions:
    - `.github/copilot-instructions.md`
- Documentation index/versioning:
    - `src/docs/index.en.md`
    - `src/docs/versions.en.md`
    - `src/docs/versions.de.md`
    - `src/docs/versions.id.md`
    - `src/docs/versions.ja.md`
- New changelog docs:
    - `src/changelogs/index.en.md`
    - `src/changelogs/cleanup-strings-and-codebase.en.md`
- Removed root changelog:
    - `CHANGELOG.md`
- Relocated DB stores (removed from `src/adapters/db/reuse/`):
    - `src/api/reuse/account-store.ts`
    - `src/gateways/notify/notification-store.ts`
    - `src/gateways/db/reuse/executor-log.ts`
    - `src/adapters/notify/internal/db-store.ts`
    - `src/adapters/social/profile/store.ts`
    - `src/adapters/social/profile/preference-store.ts`
- MariaDB adapter fix:
    - `src/adapters/db/mariadb/adapter.ts`

## Commits

- [6ab293a](https://github.com/le-firehawk/Cognis/commit/6ab293a)
- [8299d2b](https://github.com/le-firehawk/Cognis/commit/8299d2b)
- [b93c948](https://github.com/le-firehawk/Cognis/commit/b93c948)
