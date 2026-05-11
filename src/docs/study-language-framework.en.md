# Study Language Framework

## Overview

The Study Language Framework defines how language-learning content is structured, registered, and delivered in Cognis. It provides a layered architecture that separates the Study gateway (infrastructure) from individual language modules (content), and separates each language's core library (the canonical reference of every character, word, and definition in the language) from its child components (interactive study activities).

A **language module** is a self-contained TypeScript package that registers itself with the Study gateway at bootstrap time. It does not follow the adapter pattern used by infrastructure concerns such as the database or notification system; instead, it is a content module whose primary job is to populate and expose the language library and advertise its child components so the UI can navigate to them. Adding a new language means adding a new module directory; the Study gateway discovers it automatically.

The framework is designed to be granular. Contributors can extend a language by adding a single child component (e.g. a Hiragana quiz, a kanji stroke-order viewer) without touching the core language module. Each child component self-registers a sub-navigation entry that appears under the Study page when the user selects that language.

## Responsibilities

- Define the contract that every language module must implement.
- Define the library data model: the layered register of characters, alternate characters, definitions, words, and sentences.
- Define how child components register sub-navigation pages and integrate with the library.
- Specify how the Study gateway discovers language modules and exposes them to the UI.
- Provide standards so contributors can add characters, words, or study activities without understanding the full system.

Not responsible for: how the Study gateway discovers adapters (that is documented in the gateway docs), general session or class management (that is the classes adapter), or teacher-request workflows.

## Architecture

### The language module contract

Every language module exports two named functions:

```ts
export function createLanguageModule(): LanguageModule | null;
export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void>;
```

`createLanguageModule` is called during adapter-discovery so the gateway can populate its language registry quickly, before full bootstrap. Return `null` to gracefully opt out (e.g. when a required environment variable is absent).

`bootstrapLanguageModule` is called during the bootstrap phase and receives a context object through which the module registers routes, child components, and static assets.

The `LanguageModule` interface:

```ts
interface LanguageModule {
    readonly languageCode: string; // BCP 47 code, e.g. 'ja', 'ko', 'zh-TW'
    readonly languageName: string; // Human-readable name in the language itself
    readonly languageFlag: string; // Emoji flag, e.g. '🇯🇵'
    readonly version: string; // Semver
    listChildComponents(): LanguageChildComponent[];
}
```

### The library data model

The library is the authoritative multi-layer register of everything in a language. Layers build on each other from the bottom up:

**Layer 1 — Characters (`characters`)**
The atomic writing units of the language. For Japanese this is hiragana and katakana; for Korean, jamo. Does NOT include compound symbols such as Kanji (those belong in alt_characters). Every character carries:

```ts
interface Character {
    id: string; // Stable unique identifier, e.g. 'ja:char:a'
    symbol: string; // The rendered glyph, e.g. 'あ'
    romanization?: string; // Standard romanization, e.g. 'a'
    category?: string; // Grouping within the script, e.g. 'hiragana', 'katakana'
}
```

**Layer 2 — Alternate Characters (`alt_characters`)** _(optional)_
Compound or logographic symbols derived from base characters. Kanji are the canonical example: each kanji can map to one or more base characters or to a combination of base characters. Every alt_character carries:

```ts
interface AltCharacter {
    id: string; // Stable unique identifier, e.g. 'ja:kanji:日'
    symbol: string; // The rendered glyph, e.g. '日'
    components: string[]; // IDs of constituent characters or other alt_characters
    readings?: string[]; // Romanized or phonetic readings, e.g. ['nichi', 'jitsu', 'hi']
}
```

**Layer 3 — Definitions (`definitions`)**
A flat store of meanings. A definition is a short phrase or sentence in a specific language (the _definition language_, typically the learner's UI language) that describes a concept. Definitions are referenced by words and sentences rather than being embedded in them, so a single definition can be shared across multiple words.

```ts
interface Definition {
    id: string; // Stable unique identifier
    text: string; // The definition text
    language: string; // BCP 47 code of the definition language, e.g. 'en'
}
```

**Layer 4 — Words (`words`)**
Combinations of one or more characters or alt_characters that form a meaningful unit. Words map to one or more definitions, ranked by commonality so an unassuming pull always returns the most common meaning first.

```ts
interface Word {
    id: string; // Stable unique identifier, e.g. 'ja:word:nihon'
    graphemes: string[]; // Ordered list of character/alt_character IDs
    definitionIds: string[]; // Ordered by commonality (primary first)
    reading?: string; // Romanized reading of the whole word
    jlptLevel?: string; // Optional proficiency tag, e.g. 'N5'
}
```

**Layer 5 — Sentences (`sentences`)**
Ordered sequences of words. A sentence may carry an explicit definition reference (a bespoke definition written just for this sentence), or it may inherit its meaning by concatenating the primary definition of each constituent word.

```ts
interface Sentence {
    id: string; // Stable unique identifier
    wordIds: string[]; // Ordered word IDs that form the sentence
    definitionId?: string; // Optional explicit definition; falls back to word definitions
}
```

### Child components

A child component is an independently deliverable study feature for a specific language. It advertises itself via the language module so the UI can build a sub-navigation menu. Child components should primarily be interfaces to and from the library — they consume library data and optionally write back to it (e.g. a quiz records which characters a user has practiced).

```ts
interface LanguageChildComponent {
    id: string; // Unique within the language, e.g. 'hiragana-alphabet'
    label: string; // Display name shown in the sub-nav, e.g. 'Hiragana Alphabet'
    pageUrl: string; // URL the router navigates to, e.g. '/study/ja/hiragana'
    order?: number; // Lower numbers appear first in the sub-nav menu
}
```

Each child component registers its own route during `bootstrapLanguageModule` via `ctx.registerChildRoute`. The route serves an HTML page or API endpoint. The UI constructs a `<nav>` under the Study page from the list of registered child components for the active language.

### Registration flow

```
startup
  └─ Study gateway: discoverLanguageModules(modulesRoot)
       └─ for each language module dir: createLanguageModule() → register in languageRegistry
  └─ Study gateway: bootstrapLanguageModules(modulesRoot, ctx)
       └─ for each module: bootstrapLanguageModule(ctx)
            ├─ ctx.registerChildRoute(path, handler) — registers child page routes
            ├─ ctx.registerStaticDir(prefix, dir)   — serves static assets
            └─ ctx.gateway.registerLanguageModule(module) — adds to runtime registry
  └─ Study gateway exposes:
       GET /api/v1/study/languages/:code/modules → lists child components for that language
```

### Directory structure

Language modules live under `src/modules/study/languages/<code>/`. Each language directory contains:

```
src/modules/study/languages/ja/
  package.json          ← version + main field
  index.ts              ← exports createLanguageModule + bootstrapLanguageModule
  library/
    characters.ts       ← Layer 1 data
    alt-characters.ts   ← Layer 2 data (Kanji, optional)
    definitions.ts      ← Layer 3 data
    words.ts            ← Layer 4 data
    sentences.ts        ← Layer 5 data
  components/           ← one sub-directory per child component
    hiragana-alphabet/
      index.ts          ← registers route + child component metadata
      ui/
        index.html
        app.js
    kanji-explorer/
      index.ts
      ui/
        index.html
        app.js
  docs/
    standard.en.md      ← language-specific contributor guide
```

Child components may themselves contain sub-components for deeply nested functionality (e.g. a Kanji explorer with separate stroke-order and vocabulary sub-sections). The `pageUrl` for such sub-components would include an additional path segment, and the child component's own UI handles any internal sub-navigation.

## Configuration

Language modules have no global environment variables. Each module's `package.json` carries a `version` field; bumping it is required whenever the module's library data, API surface, or component list changes.

## Extension Points

### Adding a new language

1. Create `src/modules/study/languages/<code>/package.json` with a `main` field.
2. Export `createLanguageModule()` and `bootstrapLanguageModule(ctx)` from the main entry point.
3. Implement the `LanguageModule` interface.
4. Run the Study gateway bootstrap; the new language is auto-discovered.

### Adding a child component to an existing language

1. Create `src/modules/study/languages/<code>/components/<component-id>/index.ts`.
2. Export a `registerComponent(ctx)` function that calls `ctx.registerChildRoute()` and returns a `LanguageChildComponent` descriptor.
3. Call `registerComponent(ctx)` from `bootstrapLanguageModule(ctx)` in the parent language's `index.ts`.
4. Add the UI page under `components/<component-id>/ui/`.

### Adding deeply nested sub-components

If a child component itself requires sub-sections (e.g. stroke order and vocabulary within a Kanji explorer), manage the internal sub-navigation within the child component's own UI. The `LanguageChildComponent.pageUrl` points to the top-level entry; all sub-section routing is handled client-side within that component's page.

## API Routes

| Method | Path                                    | Description                                          | Auth     |
| ------ | --------------------------------------- | ---------------------------------------------------- | -------- |
| GET    | `/api/v1/study/languages`               | List all available study languages                   | Required |
| GET    | `/api/v1/study/languages/:code/modules` | List child components registered for a language code | Required |
