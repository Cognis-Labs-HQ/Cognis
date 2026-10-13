# Contributor Standard

Cognis components use predictable concern directories, public ctx contracts and localized documentation so contributors can extend a component without coupling it to another implementation.

## Usage examples

Create an external module from [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template). Assign the new product its own UUID, replace template metadata, and retain its contributor guidance and validation tools. Jitsi Meet is the reference integration for the structure and lifecycle contracts below.

```sh
npm --prefix <module-checkout> test
cognisctl modules:jitsi-meet:ping
```

## Technical specification

### Component ownership

Core contracts live in `src/core/`; gateways in `src/gateways/<id>/`; adapters in `src/adapters/<gateway>/<id>/`; external modules in their own repositories. Each component owns its server code, browser assets, CLI commands, documentation and cleanup. Imports stay inside the component; obtain cross-component behavior through ctx capabilities and named staged flows. Optional providers must be removable without breaking consumers.

### Required module layout

The concern paths below are mandatory when a module implements that surface. Do not create empty directories for unsupported surfaces. Root `manifest.json`, `package.json`, `routes.json` and `bootstrap.js` are required. Bootstrap wires dependencies and registers behavior; domain handlers validate and orchestrate while stores and capabilities execute work. A declared `ui/index.html` may serve as a page shell. Keep existing route URLs stable when reorganizing files.

| Path                                              | Responsibility        |
| ------------------------------------------------- | --------------------- |
| `api/routes/<domain>/index.js`                    | HTTP                  |
| `api/<feature>/`, `api/reuse/`                    | Server                |
| `ui/app/<page>/index.js`, `ui/<feature>/`         | Browser               |
| `ui/styles/`, `ui/styles/reuse/`                  | CSS                   |
| `ui/templates/`                                   | HTML                  |
| `ui/languages/<locale>/strings.xml`               | i18n                  |
| `api/tests/`, `ui/tests/`, `cli/tests/`, `tests/` | Tests                 |
| `cli/index.js`                                    | CLI                   |
| `docs/`, `docs/changelog/`                        | Markdown              |
| `data/`, `assets/`, `scripts/`, `tooling/`        | Data, assets, tooling |

### Reusable code and checks

Use `reuse/` only for an abstraction consumed across features within its owning layer. Keep feature logic beside its feature, and use generic filenames inside domain directories. Do not create `shared/`, `utils/`, `helpers/` or `common/` directories. Keep readable declaration spacing and a 1000-line source ceiling. Structure checks reject misplaced styles and flat route-handler files; public-contract tests cover authorization, failure rollback, repeated mounts and enable-disable-enable. Npm scripts belong to the checkout: use `npm --prefix <module-checkout> test`. Installed operational commands use `cognisctl modules:<module-id>:<action>`.

### Documentation contract

Every integration document begins with an H1 of at most 30 characters and an informative opening paragraph. Its first H2 gives concrete public-contract usage examples; the next H2 starts the technical specification. Follow `.github/DOCUMENTATION_TEMPLATE.<locale>.md`. Use H3 sections for inputs, outputs, validation, permissions, errors, state changes, persistence, security, extension stages and cleanup. Document required capabilities, optional dependencies, supported versions and failure behavior. Standard documents describe the current contract, not release history or individual bug fixes.

### Localization and release integrity

Provide German, English, Indonesian and Japanese variants with matching structure and genuine translations. Put an integration overview in `docs/index.<locale>.md` and focused contracts beside it. Release notes belong in `docs/changelog/` (`src/docs/changelog/` in core), with one four-language set per PR and contiguous commit links. Exclude release notes, symlinks, aliases and the manifest itself from module digests. Synchronize package, lockfile, manifest and tested dependency ceilings; regenerate and validate digests after the final shipped-file edit.
