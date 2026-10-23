# Smaller Brand Icons

**Feature Branch:** perf-small-brand-icons

## Reuse the Install Icon

Page favicons, shell branding, dashboard widgets, authentication and error surfaces now reuse the existing square install icon. The original artwork remains available at its existing URL. No image conversion or new asset dependency is introduced.

## Bound Startup Image Transfer

Service-worker installation precaches the existing small and large install icons without also fetching the oversized source artwork. The worker cache version advances so existing clients refresh the shell asset list. Private API handling and module revision behavior are unchanged. Route and worker-install regressions enforce image transfer budgets.

## Commits

- [eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/eaa76ae32f517fd4b2a52fd1c064aa19720dc9ac)
- [b1fd6cd8f41b6b03855eef1f87a21e98989e46b8](https://github.com/Cognis-Labs-HQ/Cognis/commit/b1fd6cd8f41b6b03855eef1f87a21e98989e46b8)
