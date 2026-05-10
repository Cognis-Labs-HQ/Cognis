# Japanese Study Adapter

The Japanese study adapter (`src/adapters/study/japanese/`) serves Japanese language learning content at `/study/ja`.

## Structure

- `index.ts` — adapter entry point; registers the `/study/ja` page route and ensures the `ja` study language entry exists in the database.
- `ui/index.html` — page shell loaded by the server.
- `ui/app.js` — client-side module that mounts the dashboard layout with study content.

## Content Sections

The page is structured around five study areas:

- **Hiragana** — basic phonetic syllabary
- **Katakana** — syllabary for loanwords and emphasis
- **Vocabulary** — curated word lists
- **Grammar** — sentence patterns and structures
- **Kanji** — Chinese-origin characters

## Contributing

Each section is a placeholder `<h2>` heading. Contributors can add granular sub-modules by creating separate JS modules and importing them into `ui/app.js`.
