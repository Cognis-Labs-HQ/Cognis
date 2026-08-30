# Reliable Module Navigation

## Modules no longer remount during SPA navigation

The Modules page now uses the shared direct-page mount guard. Loading it through the dashboard router no longer triggers a second mount that duplicates navigation components and disrupts later SPA navigation.

## Page styles are isolated during navigation

The dashboard router now identifies route-owned styles from direct page loads and removes the previous page's styles before mounting the destination. Navigating from Meetings to Messages therefore cannot leave meeting-specific button rules behind to distort page-composer sidebars.

## Navigation controls render with their styles

Messages now loads each conversation stylesheet before mounting instead of relying on a chain of CSS imports, preventing conversation avatars from flashing at their unstyled size. The notification plugin also waits for its stylesheet before inserting the bell into the navigation bar.

## Route root styles no longer leak

The dashboard router now clears route-owned classes from the shared app root before mounting the next page. Meetings styling therefore cannot remain active on page-composer sidebars even when a module leaves its root class behind before a meeting starts.

## Shared capability styles persist

Styles loaded by shared UI capabilities now remain available across route changes, while only explicitly route-owned styles are removed. Profile avatar presentation therefore remains complete when navigating from Profiles to Meetings. Automated lifecycle coverage now checks every core, gateway, and adapter SPA page entry.
