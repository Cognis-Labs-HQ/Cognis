# Changelog Summary Update

## Parse Changelog Headings
Release-changelog ingestion now treats the file `#` heading as the changelog
title and `##` headings as summary dot points for release popups.

## Show Dot-Point Summary
The release popup now shows changelog titles with dot-point summaries derived
from `##` headings. Detailed body text stays in the changelogs page.

## Add Positive User Setting
Settings now use a positive “Show Changelogs” control with an info tooltip:
“Present changelog summary on every release.”

## Document New Changelog Rules
Contributor instructions now define the mandatory changelog structure, reaffirm
the single `src/docs/changelog/` directory, and require one changelog file per
PR in all supported languages.
