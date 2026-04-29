# Cognis UI

Pluggable UI shell with a Jira-like page builder experience.

## Structure
- `public/assets/icons/`: static brand media and icon assets.
- `src/config/`: page and widget defaults.
- `src/components/`: widget registry and reusable component logic.
- `src/app/`: runtime app assembly and demo puppeteering flow.
- `src/styles/`: app-level styles.

## Demo mode switch
The API route `GET /api/v1/system/ui-config` reads `COGNIS_UI_DEMO_MODE` from the server environment and enables the puppeteered UI demo flow when set to `1` or `true`.

## UX + security defaults
- Clean URI: UI shell is served from `/dashboard`.
- Security headers + CSP are applied by server-side UI route handling.
- Demo mode can only be enabled via environment configuration (no URL toggles).

## Sandbox page
The `Sandbox` page is intentionally packed with all default widgets so feature behavior can be validated quickly in one place.
