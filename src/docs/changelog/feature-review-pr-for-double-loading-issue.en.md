# Reliable Module Navigation

## Modules no longer remount during SPA navigation

The Modules page now uses the shared direct-page mount guard. Loading it through the dashboard router no longer triggers a second mount that duplicates navigation components and disrupts later SPA navigation.

## Page styles are isolated during navigation

The dashboard router now removes the previous page's styles before mounting the destination. Navigating from Meetings to Messages therefore cannot let meeting-specific styles distort the Messages layout while it is being constructed.
