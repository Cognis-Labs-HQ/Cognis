# Complete release changelog summaries

**Feature Branch:** feature-fix-changelog-rendering-issues

## Show changelog details in the release popup

Release notifications now display the explanatory content beneath each change heading instead of presenting headings alone.

## Include installed external modules

The release feed now discovers localized changelog files supplied by installed external modules and links each entry to its module changelog page.

## Linked and grouped changelogs

Release popup headings now link directly to their complete Cognis Core changelog. External-module changelogs display their module separately and are included in the complete Changelogs index.

## Updated repository references

Historical commit links now point to the current Cognis-Labs-HQ/Cognis repository.

## Commits

- [968c109](https://github.com/Cognis-Labs-HQ/Cognis/commit/968c109885b2db1e168a7c62cc29b3c6be3d7b27)
- [0a22467](https://github.com/Cognis-Labs-HQ/Cognis/commit/0a224676b04a06123eb6f4dd256051d6a2fc5933)
- [4c60e84](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c60e8410ee4b50e01fea0248b521199757f48fc)

## Complete changelog provenance

Automated checks now require every localized changelog to identify its feature branch and include canonical commit links. Entries that cannot be matched to either historical repository explicitly use N/A with an empty commit list.

## Short commit references

The Changelogs page now displays each commit link as its seven-character reference while preserving the complete canonical commit URL as the link destination.

## Short refs in release popups

Release changelog popups now apply the same short-reference formatter as the full Changelogs page, keeping complete commit URLs as link targets.

## Commit provenance workflow

AI contribution instructions now require a final changelog-only bookkeeping commit, when requested before implementation, that records the immediately preceding implementation commit.

## Refresh generated documentation

Documentation ingestion now refreshes the archive for the currently installed component version, so factual source corrections such as repository URL updates replace stale generated copies while older version snapshots remain available.

## Safely refresh documentation archives

Documentation ingestion now leaves unchanged archive files untouched and atomically replaces only content that changed, preventing repeated writes and partially read files during concurrent requests.

## Escape external module names

Changelog navigation now escapes module-provided names before inserting them into labels and attributes, preventing module metadata from creating active markup.

## Consistent commit links

Historical changelog commit lists now consistently use linked seven-character references while retaining complete canonical commit URLs.
