# Cognis UI

Implicit submissions from attached forms are handled in place and cannot submit a browser document request. Component submit handlers still receive the event. Internal page redirects use the SPA router; deliberate server-rendered destinations honor the same unsaved-change decision and recheck offline availability when resumed.

`openPopup({ signal })` scopes a popup to its owner. Aborting the signal closes the popup and any discard decision and releases listeners, timers, form tracking and scroll locks. Owner disposal does not ask whether to retain content belonging to an expired page or identity. Concurrent cancel paths share one discard decision.

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

Page overlays mount at the document body to keep viewport positioning independent of workspace backdrop filters and containing blocks. The drawing pad remains bounded to the visible page and retains its dragged position while scrolling.

## Administration Controls

In Administration → Components, each status label, health light and power switch uses its content width. Narrow component rows place the name above the controls and keep the disclosure beside them; controls can wrap inside the available row width. Long names, status labels and version details remain readable.

Power switches and disclosure controls have 44-pixel-high targets. Tab focuses an enabled switch, Space changes it, and the focus ring follows the visible slider. Required gateways and locked or unavailable adapters retain their disabled controls. The Components tutorial explains keyboard operation and continues to use the same power, disclosure, metadata and configuration targets.

## Shared Form Headings

The shared form builder groups each field heading and its required marker in one text container. Labels can wrap in narrow forms; the marker uses a nonbreaking space and stays inline instead of becoming a separate grid item. Native control labels, required attributes, rich label links and tooltip buttons retain their roles. `setFieldRequired` updates the same heading for text, select, textarea, checkbox and radio fields.
The heading prevents a break between its content and marker while the inner label content permits wrapping, including long unbroken words.

Form headings remain within their existing fields. Calendar and Sharing tutorial targets and progression do not change; no new action or tutorial step is needed.

## Password Form Labels

Cross-component password forms use `ui.reuse.password_requirements` and `ui.reuse.passwords_match` from the host XML catalogs. Auth and Registration consume the same keys in English, German, Indonesian and Japanese. Ship the host catalogs with Auth 2.2.13 and Registration 1.2.9; integrations using these labels must adopt the shared keys. Same-key English fallback remains strict, including an explicit failure when English is missing or empty.

## Contextual Help

Use `renderInfoTooltip(localizedText, localizedLabel, optionalId)` beside the existing label or heading. Resolve help text and the button label through the owning XML catalog; keep descriptions as plain text. The shared owner has no independent component version.

Hover or focus the information button to read its help. Help stays open while its button has focus or the pointer is on the button or panel. Entering another help button selects that explanation; leaving it restores another still-active focused or hovered explanation. Escape dismisses help without moving focus or consuming other Escape handlers. The dismissed interaction must end before that button opens help again. Scroll and resize still dismiss the panel.
When keyboard focus switches explanations while the pointer remains on the shared panel, that panel interaction belongs to the newly displayed explanation until a pointer departure or dismissal.

The non-focusable panel uses `role="tooltip"`; the active button adds its panel ID to `aria-describedby` without replacing other descriptions. Removing the button releases its help. A document replacement releases old listeners and observations, and leaving the page clears its active help. The fixed, themed panel retains its placement rules and a transparent pointer bridge across the gap, without delayed callbacks.

Existing page tutorials keep their labels, targets and progression: help remains available beside the same controls, with no new action or tutorial step. Guidance: [W3C content on hover or focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) and the [APG tooltip pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). The APG pattern is work in progress without task-force consensus. DOM event tests do not certify conformance, rendered geometry, touch behavior or assistive-technology output.
