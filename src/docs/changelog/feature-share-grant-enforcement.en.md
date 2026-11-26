# Share Access and Translations

**Feature Branch:** feature-share-grant-enforcement

## Enforce expiry at access checks

Direct user shares stop granting access at expiry, including password-unlocked shares retained for history. An empty expiry remains unlimited; malformed nonempty expiry values deny access.

## Honor explicit grant revocation

PATCH with `grantedCapabilities: []` removes every granted capability. Omitting the field preserves grants; a nonempty array replaces them. Recipient, password and adapter checks remain in force. Delivered Calendar access is removed when the read grant is cleared. Requests and token exports check current grants even while delivery reconciliation is pending.

## Translation Catalogs

Keyring catalogs use the runtime XML root so guest Share URLs can create their temporary keyring without a missing-translation failure. Missing labels in room-key prompts, reactions, calendar series editing, email actions, notification controls, SSO callbacks and Administration status are supplied in all four languages. Catalog-root and literal-reference checks prevent the same omissions in other components.

## Share page sessions and layout

Protected links reuse one password prompt and guest keyring across repeated or concurrent authentication. Pending resolution is discarded when navigation or account identity changes. Guest pages skip account-only profile requests. Link popup assets resolve within their adapter mount. Calendar share renderers await their owned stylesheets and keep title, navigation controls and scrollable content in separate rows at mobile, tablet and desktop sizes.

## Documentation conventions

Core topics use uppercase INFO, USAGE and TECHNICAL filenames with locale suffixes, retaining their existing URLs and versioned views. Validation rejects lowercase and mixed-case filenames and manifest pointers. Changelog links display concise commit references while keeping full immutable SHAs in their destinations; existing long labels are corrected across core and component changelogs.

## Calendar period navigation

Shared calendars support the same month, week and day drill-down as account calendars through one lifecycle-bound control binding. The selected date and view update together. Week-number labels remain horizontal unless their own column is constrained, independently of viewport width.

Use Today, This Week, This Month or This Year to return to the current period without changing the selected view. The arrows move one selected period at a time; these controls also work in shared calendars.

Current-period labels remain specific to the selected view at every panel width, including guest calendars. Browser coverage checks fresh and cached reloads under the actual service worker.

## Documentation reference contracts

Core manuals describe the current HTTP host, component/adapter bootstraps, language-provider discovery, browser/offline boundaries and public source locations. Technical references separate contracts from procedures and release history. Corrected preferences routes, module README language fallback and immutable module-ID namespaces; repeated passphrase examples are consolidated. Checks validate documentation destinations and repository source links. Changelog HTML-label validation counts text directly without constructing stripped HTML, including malformed and split-tag labels.

## Strict documentation layouts

Info, Usage and Technical enforce the documented heading matrix in all four languages. Layout validation rejects empty visible sections, hidden comment content, alternate headings and malformed fences. Filename checks include extension and locale casing. Tests keep every localized standard synchronized with the executable schema.

## Commits

- [37279a3](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
- [1f9c347](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f9c347e1ba3f836f54add76ce83592d85513f3e)
- [ab2b8bb](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab2b8bbb31f93dbc3c816ed2988ff01e4d585c58)
- [a7fe8ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7fe8ac3730ec41b4cacc15166715ddbef76eab3)
- [915ed28](https://github.com/Cognis-Labs-HQ/Cognis/commit/915ed288e7efc3c2be5a471126793ab81400d018)
- [67775d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/67775d47445dd7a6cd070645c7c39bd0ee10678a)
- [aace4dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/aace4ddebf574a6bded9c525c017a0d862de855e)
- [f1f86ea](https://github.com/Cognis-Labs-HQ/Cognis/commit/f1f86ea0a157ac3486f0da039230e18bfd276b1e)
- [4df7e6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/4df7e6eb69aa07ab7528c346db81754b4574818b)
- [2cadeac](https://github.com/Cognis-Labs-HQ/Cognis/commit/2cadeac36d4fa009791d3ecfb4f0c021e2a62c47)
- [9b619f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/9b619f145410bad15307953c0668e8cc6a68dcb7)
