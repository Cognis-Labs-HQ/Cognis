# Document Diffs

Document diffs let a module explain the differences between two immutable document versions before a user acts on the newer copy.

## Usage Examples

Call `store.diff(fromVersion, toVersion)` through a store created by the `docs:versionStore` capability. Runtime modules can return that structured result from their own authenticated route, resolve `ui:documentDiff` through browser ctx, and pass the result to `renderDocumentDiff(diff)`.

## Technical Specification

Both hashes must exist in the store namespace and belong to the same document slug. The result contains the source and destination hashes, the shared slug, and ordered lines classified as `unchanged`, `added`, `removed`, or `changed`. Changed entries carry both the previous and replacement text.

The browser renderer escapes dynamic text and presents added lines in green, changed lines in orange, and removed lines in red.

## Markdown comparison views

Use `renderMarkdownDocumentDiff(diff)` from the browser `ui:documentDiff` capability to render the complete destination document through the host Markdown renderer. Unchanged content keeps its normal document presentation, while additions, replacements, and removals receive green, orange, and red overlays with overview-rail navigation.
