# Preserve Page Form Drafts

## Summary

- Form values are now preserved not only across responsive re-renders, but also
  across full page refreshes through per-user/per-page draft persistence.
- Persisted drafts are wired for both the main grid composer and nested
  sub-composers.
- Sensitive field types and identifiers are excluded from persistent storage.
- Large forms now show a **Reset Draft** action so users can clear persisted
  input quickly when draft retention becomes noisy.

## Changed Files/Components

- `src/ui/reuse/page-composer/init.js`
- `src/ui/tests/page-composer-refresh.test.js`
- `src/ui/styles/page-builder.css`
- `src/ui/languages/{en,de,id,ja}/strings.xml`
- `src/docs/page-composer.{en,de,id,ja}.md`

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/9888e39
- https://github.com/le-firehawk/Cognis/commit/b42d6d9c
- https://github.com/le-firehawk/Cognis/commit/1cabb35b
