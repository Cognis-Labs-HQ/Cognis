# Search util conventions

All UI components that contribute searchable content should use the shared
search utilities instead of creating component-specific search helper files.

## Standard filenames

- `search/index.js` is the only component-owned entry point for async indexes
  that fetch or derive content outside the currently rendered DOM.
- `search-metadata.js` is reserved for tiny, static maps used by
  `search/index.js`; do not put provider logic there.
- `search-util/*` under `src/ui/reuse` contains shared normalization,
  extraction, highlighting, and registration helpers used by every component.

## Standard function names

- `buildSearchResults(context)` returns grouped search results for a component.
- `registerSearchIndexing()` registers the component provider with
  `registerSearchIndex`.
- `collect<SearchArea>SearchGroups(context)` is used only for DOM-local or
  page-local groups inside an existing UI file.

Providers should return full indexes for names, headings, sub-navigation,
settings, and body content. Put expensive work inside the provider, make it
async, cache where appropriate, and let the shared search util filter, rank,
highlight, and render matches.
