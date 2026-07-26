# Cognis UI

## Structure

- `src/layouts/`: reusable page layout guardrails.
- `src/reuse/`: shared utilities.
- `public/templates/`: HTML templates imported by JS and served as static assets.
- `src/app/`: page behavior (study app surfaces, login, docs, admin/settings/modules).

## UX model

Pages (except login) should render through a layout module so row/column guardrails remain consistent while widget customization stays flexible.

## API-driven features

- Login uses `/api/v1/auth/login`.
- Product docs UI reads `/api/v1/docs`.
- User page preferences use `/api/v1/social/users/:accountId/preferences/:pageId`.

## Internationalisation (i18n)

All user-visible text must be resolved through the i18n helper — never hardcoded in JS or HTML templates.

### Adding a new string

1. Add the key/value pair to every language pack under `src/ui/languages/<locale>/strings.xml`, starting with `en`:

    ```xml
    <string name="ui.app.mypage.my_label">My label</string>
    ```

2. Use `ui.reuse.*` keys for labels that appear on more than one page, and `ui.app.<page>.*` for page-specific copy.

3. Look up the value in JS with `i18n.t()`:

    ```js
    const i18n = await createI18n();
    element.textContent = i18n.t("ui.app.mypage.my_label");
    ```

4. For static HTML templates, add a `data-i18n` attribute and call `applyStaticTranslations(i18n)` once after rendering:

    ```html
    <span data-i18n="ui.app.mypage.my_label"></span>
    ```

    ```js
    applyStaticTranslations(i18n, root);
    ```

    Use `data-i18n-placeholder` for `placeholder` attributes and `data-i18n-aria-label` for `aria-label` attributes.

### Supported attributes

| Attribute               | Sets                  |
| ----------------------- | --------------------- |
| `data-i18n`             | `element.textContent` |
| `data-i18n-placeholder` | `element.placeholder` |
| `data-i18n-aria-label`  | `element.ariaLabel`   |

### Language files

Language packs live in `src/ui/languages/<iso>/strings.xml`. The runtime loads them on demand and caches them for the session. The user's language preference is persisted in `localStorage` and a cookie, and can be changed via the Settings page.

Fallback order: preferred languages (in priority order) → `en`.

### Enforcement

`src/ui/tests/hardcoded-strings.test.js` runs two checks:

- **Quoted string literals** — flags multi-word strings in single/double-quoted literals that look user-facing and are not key references.
- **HTML template text nodes** — scans template literals for literal text between HTML tags (e.g. `<th>ID</th>`) and flags any that contain alphabetic characters without an interpolated `i18n.t()` call.

Run with:

```
node --test src/ui/tests/hardcoded-strings.test.js
```

All committed code in `src/ui/app` and `src/ui/layouts` must pass both checks.

## Advanced preference editing

The Advanced → Preferences panel exposes the complete UI preference document as JSON after a one-time safety confirmation stored in the user's server-backed profile. Valid edits are saved and applied through the normal preference system. Release acknowledgement bookkeeping is stored separately so it does not clutter this document.
