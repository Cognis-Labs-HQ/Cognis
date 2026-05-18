# Preserve Form Inputs Across Page Composer Grid Re-renders

## Summary

When the page composer switches between small-screen and large-screen display
variations the grid is re-rendered, which previously wiped any text, selections,
or checkboxes the user had entered into visible element cards. Form field
values are now captured immediately before the grid is cleared and restored into
the freshly rendered cards, so users never lose their work during a screen-size
transition.

The fix covers both the main grid composer and the sub-grid composer. Fields
are matched by `name`, then `id`, then ordinal position within each element
card, so the restore is robust to minor HTML structure changes.

## Changed Files/Components

- `src/ui/reuse/page-composer.js` — `captureFormState` / `restoreFormState`
  helpers added; called in `renderGridComposer` and `renderSubGrid`
- `src/ui/tests/page-composer-refresh.test.js` — new structural test

## Commit Links

- https://github.com/le-firehawk/Cognis/commit/9888e39
