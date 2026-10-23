# SSO Host Compatibility

**Feature Branch:** fix-sso-host-compatibility-pr226

## Verify Callback Host Exports

External SSO callbacks require both `mountWhenDirect` and `navigateToDocument` from the host `page-entry.js`. Run `npm run check:ui-host` against the source checkout and `npm run check:ui-build` against built assets. After deployment, run `npm run check:ui-host -- --origin https://your-cognis-host.example` from a network that reaches the host. The remote check only reads public JavaScript, sends no credentials, and parses exports without executing downloaded code. Proxy-based environments can enable Node’s environment proxy support with `NODE_USE_ENV_PROXY=1`.

Deploy the matching Core host before updating callback modules, including the host UI assets and asset manifest; restart the serving process if it still uses the previous release. Refresh the callback page only after the public host-export check passes. A module version does not prove which host asset is being served. Registration authorization remains required for unknown external identities when public registration is disabled; returning mapped identities do not repeat account-creation authorization. HTTP 403 alone cannot identify the denial reason: inspect the response error code and registration continuation fields without sharing credentials or cookies.

## Commits

- [dd1b1fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd1b1fac635d28ef8ee9f223e86eb41fd3e08120)
