# Documentation Contracts

Documentation separates introductory information, practical procedures and technical reference so each reader can choose the detail they need.

## Interfaces

Every component declares `documentation.readme`, `documentation.usage` and `documentation.technical`. Their values are `docs/README.md`, `docs/USAGE.md` and `docs/TECHNICAL.md`. English is unsuffixed; translations append `.de`, `.id` or `.ja`. Core topics are discovered from directories containing `index.<locale>.md`, `usage.<locale>.md` and `technical.<locale>.md`.

## Configuration

Run `npm run check:docs`. Pull-request CI also compares the added changelog files against the head branch using `--base` and `--branch`. Exactly one four-language changelog set is permitted.

## Behavior

A new topic opens Info. Info, Usage and Technical are three views of one component version. The server reads all source files before atomically publishing a bundle; a missing view or partial translation rejects publication. Switching views retains the selected version, and historical bundles remain readable after component removal.

## Security

Documentation is public: exclude credentials, private account data and operational secrets. Component manifest pointers stay within their owned docs space. Core discovery reads directory entry bundles rather than arbitrary Markdown filenames.

## Reference

README explains purpose, tasks, access and first steps without endpoint specifications or implementation code. USAGE gives actual procedures or public examples, prerequisites, expected outcomes and troubleshooting. TECHNICAL covers interfaces, configuration, behavior, security and reference material.

The exact localized H2 names and order are defined in `src/tooling/reuse/documentation/structure.json`. Use one H1 of at most 30 characters and an introductory paragraph. Empty or additional sections, unfilled templates, unbalanced code fences and skipped heading levels fail validation. Templates live under `.github/documentation/`.

Describe supported behavior in the appropriate section. Release history and implementation chronology belong only in the branch changelog. Shared technical paragraphs have one owner; other documents link to that reference.

Component assets use the owning public static prefix. An asset consumed only by one component with its own asset space cannot be published in core. Core-owned and shared assets retain core publication. CSS imports form one contiguous alphabetically sorted block with one blank line before style rules.
