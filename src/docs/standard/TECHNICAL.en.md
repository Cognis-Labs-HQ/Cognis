# Documentation Contracts

Document bundles separate introductory information, executable procedures and technical contracts, with validated structure and localized source families.

## Interfaces

Every component declares `documentation.readme`, `documentation.usage` and `documentation.technical`. Their values are `docs/README.en.md`, `docs/USAGE.en.md` and `docs/TECHNICAL.en.md`. Every language keeps its suffix: `.en`, `.de`, `.id` or `.ja`. Manifest paths identify the English member of a localized document family, not a fixed display-language file. Core topics are discovered from directories containing `INFO.<locale>.md`, `USAGE.<locale>.md` and `TECHNICAL.<locale>.md`.

Document basenames are case-sensitive and uppercase. Lowercase or mixed-case INFO, README, USAGE and TECHNICAL variants are rejected, even if a correctly named file also exists.

### Required layouts

Use exactly the following H2 headings, in this order, for the document’s language. Info uses the README layout, including core INFO files. Do not translate identifiers or use alternate heading names.

| Language | Info / README                                                                            | Usage                                                                       | Technical                                                                    |
| -------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| en       | `What You Can Do` → `Before You Start` → `Get Started` → `Learn More`                    | `Prerequisites` → `Examples` → `Expected Results` → `Troubleshooting`       | `Interfaces` → `Configuration` → `Behavior` → `Security` → `Reference`       |
| de       | `Möglichkeiten` → `Vor dem Start` → `Erste Schritte` → `Weitere Informationen`           | `Voraussetzungen` → `Beispiele` → `Erwartete Ergebnisse` → `Fehlerbehebung` | `Schnittstellen` → `Konfiguration` → `Verhalten` → `Sicherheit` → `Referenz` |
| id       | `Yang Dapat Anda Lakukan` → `Sebelum Memulai` → `Langkah Awal` → `Pelajari Lebih Lanjut` | `Prasyarat` → `Contoh` → `Hasil yang Diharapkan` → `Pemecahan Masalah`      | `Antarmuka` → `Konfigurasi` → `Perilaku` → `Keamanan` → `Referensi`          |
| ja       | `できること` → `始める前に` → `はじめに` → `詳しい情報`                                  | `前提条件` → `使用例` → `期待される結果` → `問題の解決`                     | `インターフェース` → `設定` → `動作` → `セキュリティ` → `リファレンス`       |

Start with one unindented `# Title` of at most 30 characters, then a blank line and an informative prose paragraph. Follow with the required H2 sections. Surround every heading with blank lines; do not indent headings or use HTML or Setext headings. H3–H6 subsections are allowed inside a required section, without skipping levels. Every section and subsection needs visible content; a parent may contain populated subsections. Comments do not count as content.

Info contains no implementation code or endpoint specifications. Usage and Technical may use balanced backtick or tilde code fences; a closing fence must use the same character, be at least as long as its opener and have no trailing text. Headings and comments inside examples are literal content. Introductory code or lists do not replace the prose introduction.

The complete filename matrix is three files for each of `en`, `de`, `id` and `ja` (12 files per topic). Component manifests declare exactly the English README, USAGE and TECHNICAL paths; core directories use INFO, USAGE and TECHNICAL without a component manifest per topic. Basenames must be uppercase and locale suffixes lowercase. No extra Markdown manuals are accepted outside the separate changelog space.

## Configuration

Run `npm run check:docs`. Pull-request CI also compares the added changelog files against the head branch using `--base` and `--branch`. Exactly one four-language changelog set is permitted.

## Behavior

### Logging Boundary

Application JavaScript and TypeScript, inline browser scripts and event handlers must publish diagnostics through the injected log capability or the public browser diagnostic port. Native console access is restricted to the logging output adapters and the logging gateway initializer. Handlers elsewhere in the initializer’s file receive no exception. Command and build reports use explicit terminal streams. The native-console check covers tooling sources too; test fixtures remain outside the production-source scan.

Run `node --import tsx --test src/tooling/tests/logging/*.test.js` to check the repository and the detector cases. The check includes installed external modules, supports `COGNIS_EXTERNAL_MODULES_ROOT`, and reports file/line violations. It rejects aliases, computed access and `node:console` imports without a baseline exemption.

A new topic opens Info. Info, Usage and Technical are three views of one component version. The server reads all source files before atomically publishing a bundle; a missing view or partial translation rejects publication. Switching views retains the selected version, and historical bundles remain readable after component removal.

Document bodies, navigation titles and search prioritize the active UI language, then configured fallbacks and English. This selection applies consistently to Info, Usage and Technical, including archived versions.

### Translation Catalogs

Every shipped `strings.xml` catalog uses a `<resources>` root. English entries must be nonempty; other locales keep the same keys and order. Literal translation calls and HTML translation attributes must resolve to an English entry. Run `node --import tsx --test src/ui/tests/strings-coverage.test.js src/tooling/tests/translations/*.test.js` to check catalogs and source references. Computed translation keys still require component behavioral coverage.

### Binding Names

The syntax-tree naming check scans JavaScript and TypeScript throughout `src`, including gateways, tooling, tests and fixtures. It checks declarations, imports, named functions/classes, runtime enum/namespace bindings, destructuring, runtime and type-signature parameters, constructor parameter properties, catch bindings and private members. Exports, additional declarators, line breaks and type annotations do not bypass it. Known clipped words are rejected in camel-case names and constants using `src/tooling/reuse/ambiguous-name-words.json`. Numbered placeholders such as `event2` must describe their role. Static table aliases also require descriptive names. Parse failures fail validation.

Conventional developer vocabulary is accepted, including `args`, `db`, LDAP `dn`, HTTP `req`/`res`, `env`, `opts` and `params`; the glossary's `conventional` map defines the complete set and meanings. It applies to locals, signatures, private members and complete words in compound names and constants. Opaque shorthand and numbered placeholders remain errors. Other short exceptions are unused, unexported `_`, `id`, and numeric `i`/`j`/`k` counters with matching arithmetic updates. Coordinates and dimensions use descriptive names. Keep public payload keys stable, but rename owned API declarations, exports, imports and callers together to one canonical name. Naming-only import/export aliases fail validation; do not invent expansion aliases for third-party imports. Type-only identities retain their contract role. Run `node --test src/ui/tests/ambiguous-names.test.js src/tooling/tests/naming/detector.test.js`; the full suite includes these checks.

### Validation and limits

`npm run check:docs` checks real component manifests and core directories. The documentation tests mutate headings, order, content, fences, filenames and manifest pointers across every role and locale; they also compare the section matrix in every localized standard with the machine-readable schema. CI runs both the documentation command and the full test suite. These checks enforce layout and concrete reference integrity; authors must still verify factual claims against the owning implementation.

## Security

Documentation is public: exclude credentials, private account data and operational secrets. Component manifest pointers stay within their owned docs space. Core discovery reads directory entry bundles rather than arbitrary Markdown filenames.

## Reference

README explains purpose, tasks, access and first steps without endpoint specifications or implementation code. USAGE gives actual procedures or public examples, prerequisites, expected outcomes and troubleshooting. TECHNICAL covers interfaces, configuration, behavior, security and reference material.

The exact localized H2 names and order are defined in `src/tooling/reuse/documentation/structure.json`. Use one H1 of at most 30 characters and an introductory paragraph. Empty or additional sections, unfilled templates, unbalanced code fences and skipped heading levels fail validation. Templates live under `.github/documentation/`.

Describe supported behavior in the appropriate section. Release history and implementation chronology belong only in the branch changelog. Shared technical paragraphs have one owner; other documents link to that reference.

Component assets use the owning public static prefix. An asset consumed only by one component with its own asset space cannot be published in core. Core-owned and shared assets retain core publication. CSS imports form one contiguous alphabetically sorted block with one blank line before style rules.

Populate every role with useful, source-verified information rather than stock guidance. Check methods, paths, field names, permissions, defaults, persistence and incomplete integrations against their owners. Put procedural examples in Usage and implementation contracts in Technical. Automated checks reject generic placeholder guidance and missing concrete source references; they do not establish the truth of arbitrary prose.

GitHub source-file links use the repository default-branch alias `blob/HEAD` or `raw/HEAD`, including from archived documentation. Commit links in changelogs retain their immutable commit targets.

Changelog link labels use short commit references, such as the first seven characters. The destination URL retains the complete immutable SHA. Full SHAs in Markdown or HTML link labels fail both the documentation command and repository tests.

The documentation checker validates topic destinations and repository source targets. Commit-label checks count text without producing HTML; their output is a diagnostic, not sanitized markup.
