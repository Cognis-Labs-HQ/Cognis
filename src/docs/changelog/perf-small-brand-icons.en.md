# Smaller Brand Icons

**Feature Branch:** perf-small-brand-icons

## Reuse the Install Icon

Page favicons, shell branding, dashboard widgets, authentication and error surfaces now reuse the existing square install icon. The original artwork remains available at its existing URL. No image conversion or new asset dependency is introduced.

## Bound Startup Image Transfer

Service-worker installation precaches the existing small and large install icons without also fetching the oversized source artwork. The worker cache version advances so existing clients refresh the shell asset list. Private API handling and module revision behavior are unchanged. Route and worker-install regressions enforce image transfer budgets.

## Commits
