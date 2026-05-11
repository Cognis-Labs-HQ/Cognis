# PR Changelog — DB Reference Final Pass

## Summary

Performed a final pass for `db.execute`, `postgres`, and `mariadb` references
and confirmed remaining matches are expected within DB adapters/gateway
implementations, provider-specific tests, and provider documentation.

Migrated changelog policy from a monolithic root `CHANGELOG.md` to per-PR
entries under `src/docs/changelog/`.

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
  - `src/docs/changelog/index.en.md`
  - `src/docs/changelog/2026-05-11-db-reference-final-pass.en.md`
- Removed root changelog:
  - `CHANGELOG.md`

## Commits

- [6ab293a](https://github.com/le-firehawk/Cognis/commit/6ab293a)
