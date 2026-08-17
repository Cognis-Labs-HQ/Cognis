# External Modules

## Stable identity

Every module has a human-readable `id` and an RFC 4122 `uuid`. The ID may be renamed; the UUID must never change, move between products, or be reused. Every `requires` entry is a component UUID. Cognis uses UUIDs for dependency and lifecycle decisions and names only for display and URLs.

## Repository contract

One Git repository delivers one module. Its root contains `manifest.json`, `package.json`, `routes.json`, and the optional orchestrator entry points `bootstrap.js`, `api/index.js`, `ui/index.js`, and `cli/index.js`. `bootstrap.js` is the sole system integration entry and receives `ctx`; it may import any file within its repository, but must not import Cognis or another component's internal paths. Export capabilities and flow stages through `ctx`. This narrow entry-point contract lets authors freely reorganize internal files without coupling Cognis to them.

The manifest declares `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, UUID-based `requires`, `entrypoints`, and `assets`. Asset paths are repository-relative. `assets.icon` identifies the square store icon, `assets.banner` identifies the detail hero, and `assets.screenshots` is an ordered gallery. Paths must remain inside the repository.

## Sources and private repositories

Administrators add a GitHub organization or GitLab group from Modules in the user menu, then Module Sources. Cognis queries the provider API, treats each repository containing a valid root manifest as a module, and derives the catalog dynamically. A source can reference an optional PAT stored in the signed-in administrator's keyring; the source record stores only the keyring identifier. Use a least-privilege, read-only token with repository and metadata access. Tokens are supplied only for discovery and cloning and are never written to source configuration.

## Installation and safety

Installation clones the selected HTTPS repository without an interactive credential prompt, validates the downloaded root manifest and immutable UUID, and atomically moves it under the external module root. Updating repeats that operation for the same UUID. Uninstalling removes that UUID's checkout. Enabling remains a separate lifecycle action so code is not executed merely by browsing or installing it. Routes must be declared in `routes.json`; protected core prefixes cannot be claimed.

Repository owners should sign releases, pin dependencies, publish checksums in `files`, avoid generated secrets, and document all requested capabilities. Screenshots must not contain credentials or personal data. Cognis administrators remain responsible for reviewing third-party code before enabling it.

## Store assets and tags

A module may declare `tags` alongside its broader `categories`; both participate in marketplace filtering. Store artwork lives at the repository root under `assets/`: provide `assets/icon.svg` or `assets/icon.png` for the catalog icon, and `assets/banner.svg`, `assets/banner.png`, or `assets/banner.jpg` for the detail-page hero. Declare the chosen paths as `assets.icon` and `assets.banner` in `manifest.json`. Optional gallery images are listed in `assets.screenshots`. Keep artwork free of secrets and personal data.
