# Search utility conventions

Shared UI search code lives in `src/ui/reuse/search-util/` and is re-exported through `src/ui/reuse/search-bar.js` for compatibility.

Components that contribute searchable content should keep their search integration in a dedicated `ui/search/index.js` file. Export a provider named `createSearchIndex` for component content and a registration helper named `registerSearchIndex` when the component owns its lifecycle. Providers should return normalized groups or items and let the shared utility handle query matching, ranking, highlighting, filtering, rendering, and stale async result handling.

Use CTX search flow stages for broad categories: `visible-indexes` for visible page and navigation content, `component-indexes` for component-owned data, and `settings-index` for settings and preferences. Expensive work such as fetching message pages, posts, docs, or calendar events should remain asynchronous in the provider so the popup can stream available results as each source completes.

Searchable DOM content should use `data-search-label`, `data-search-text`, `data-search-category`, and `data-search-result-class` attributes. Avoid ad hoc filenames or scattered search functions in unrelated files for new components.
