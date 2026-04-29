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

## Sandbox page
The `Sandbox` page is intentionally packed with all default widgets so feature behavior can be validated quickly in one place.

## Local run
Open `ui/index.html` in a browser (or serve via a static web server). To force demo mode locally without API env wiring, use `?demo=1` in the URL.
