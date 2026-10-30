# Reliable Messages Shell

**Feature Branch:** feature-fix-messages-page-missing-navigation-items

## Load the complete dashboard shell

The Messages page now uses the same shared page lifecycle as every other dashboard page. The lifecycle loads capability providers before mounting and navbar plugins after the dashboard shell exists, so all available navigation items appear and later single-page navigations retain the elements they need.

## Commits

- [7c6f1db](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c6f1db4ee279c8c3809d937e7c36b4d3448ea5c)
