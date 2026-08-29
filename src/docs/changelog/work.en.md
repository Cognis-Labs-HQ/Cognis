# Reliable Module Navigation

## Modules no longer remount during SPA navigation

The Modules page now uses the shared direct-page mount guard. Loading it through the dashboard router no longer triggers a second mount that duplicates navigation components and disrupts later SPA navigation.
