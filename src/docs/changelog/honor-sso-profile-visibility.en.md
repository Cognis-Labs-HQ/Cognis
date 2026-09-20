# Honor SSO Profile Visibility

**Feature Branch:** honor-sso-profile-visibility

## Provider-Requested Visibility

External authentication sessions and resolved external profiles can now return `profileVisibility`. Cognis validates supported values and persists the requested visibility after creating or synchronizing the profile instead of always retaining the default.

## Commits

- [b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
