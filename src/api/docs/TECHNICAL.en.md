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

A core topic directory supplies its relative directory name as the slug; the root topic uses `index`. Component slugs identify the manifest owner. All three views resolve their localized file family through the [documentation contract](/docs/standard/technical).

## Configuration

### Documentation Reader

`COGNIS_DOCS_ARCHIVE_DIR` selects the archive directory. Otherwise the archive is beside `COGNIS_CLI_TOKEN_PATH`, or under the user home directory at `.cognis/docs-archive`. The process needs write access to this location.

## Behavior

### Document Diffs

`docs:versionStore.createStore({ namespace, database, documents })` creates a namespaced store with `ensureSchema`, `getLatest`, `getVersion`, `deleteAll`, `publish` and `diff` operations. `diff(fromHash, toHash)` requires both versions to belong to the same slug.

Document diffs let a module explain the differences between two immutable document versions before a user acts on the newer copy.

### Markdown comparison views

Use `renderMarkdownDocumentDiff(diff)` from the browser `ui:documentDiff` capability to render the complete destination document through the host Markdown renderer. Unchanged content keeps its normal document presentation, while additions, replacements, and removals receive green, orange, and red overlays with overview-rail navigation. The renderer processes the composed comparison in one Markdown pass, preserving fenced code blocks, lists, quotations, and other structures that cross changed lines.

### Documentation Reader

All three views and their available translations are saved in one atomic `bundle.json` snapshot under the component version. Only complete bundles are advertised. Re-reading an installed version refreshes its content as one bundle; other published complete versions remain available.

## Security

Documentation endpoints publish read-only information. Keep credentials and private account data out of these sources. Routes using the separate document-diff capability enforce their own authentication and document authorization.

## Reference

### Technical Specification

Both hashes must exist in the store namespace and belong to the same document slug. The result contains the source and destination hashes, the shared slug, and ordered lines classified as `unchanged`, `added`, `removed`, or `changed`. Changed entries carry both the previous and replacement text.

The browser renderer escapes dynamic text and presents added lines in green, changed lines in orange, and removed lines in red.
