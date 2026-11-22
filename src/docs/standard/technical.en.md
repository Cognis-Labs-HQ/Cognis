# Documentation Contracts

Documentation separates introductory information, practical procedures and technical reference so each reader can choose the detail they need.

## Interfaces

Every component declares `documentation.readme`, `documentation.usage` and `documentation.technical`. Their values are `docs/README.en.md`, `docs/USAGE.en.md` and `docs/TECHNICAL.en.md`. Every language keeps its suffix: `.en`, `.de`, `.id` or `.ja`. Manifest paths identify the English member of a localized document family, not a fixed display-language file. Core topics are discovered from directories containing `index.<locale>.md`, `usage.<locale>.md` and `technical.<locale>.md`.

## Configuration

Run `npm run check:docs`. Pull-request CI also compares the added changelog files against the head branch using `--base` and `--branch`. Exactly one four-language changelog set is permitted.

## Behavior

### Logging Boundary

Application JavaScript and TypeScript, inline browser scripts and event handlers must publish diagnostics through the injected log capability or the public browser diagnostic port. Native console access is restricted to the logging output adapters and the logging gateway initializer. Handlers elsewhere in the initializer’s file receive no exception. Command and build reports use explicit terminal streams. The native-console check covers tooling sources too; test fixtures remain outside the production-source scan.

Run `node --import tsx --test src/tooling/tests/logging/*.test.js` to check the repository and the detector cases. The check includes installed external modules, supports `COGNIS_EXTERNAL_MODULES_ROOT`, and reports file/line violations. It rejects aliases, computed access and `node:console` imports without a baseline exemption.

A new topic opens Info. Info, Usage and Technical are three views of one component version. The server reads all source files before atomically publishing a bundle; a missing view or partial translation rejects publication. Switching views retains the selected version, and historical bundles remain readable after component removal.

Document bodies, navigation titles and search prioritize the active UI language, then configured fallbacks and English. This selection applies consistently to Info, Usage and Technical, including archived versions.

## Security

Documentation is public: exclude credentials, private account data and operational secrets. Component manifest pointers stay within their owned docs space. Core discovery reads directory entry bundles rather than arbitrary Markdown filenames.

## Reference

README explains purpose, tasks, access and first steps without endpoint specifications or implementation code. USAGE gives actual procedures or public examples, prerequisites, expected outcomes and troubleshooting. TECHNICAL covers interfaces, configuration, behavior, security and reference material.

The exact localized H2 names and order are defined in `src/tooling/reuse/documentation/structure.json`. Use one H1 of at most 30 characters and an introductory paragraph. Empty or additional sections, unfilled templates, unbalanced code fences and skipped heading levels fail validation. Templates live under `.github/documentation/`.

Describe supported behavior in the appropriate section. Release history and implementation chronology belong only in the branch changelog. Shared technical paragraphs have one owner; other documents link to that reference.

Component assets use the owning public static prefix. An asset consumed only by one component with its own asset space cannot be published in core. Core-owned and shared assets retain core publication. CSS imports form one contiguous alphabetically sorted block with one blank line before style rules.

Populate every role with useful, source-verified information rather than stock guidance. Check methods, paths, field names, permissions, defaults, persistence and incomplete integrations against their owners. Put procedural examples in Usage and implementation contracts in Technical. Automated checks reject generic placeholder guidance and missing concrete source references; they do not establish the truth of arbitrary prose.

GitHub source-file links use the repository default-branch alias `blob/HEAD` or `raw/HEAD`, including from archived documentation. Commit links in changelogs retain their immutable commit targets.
