# A more focused account creation experience

**Feature Branch:** feature-implement-form-composer-for-create-account

## Compose the complete account form consistently

The Create Account page now presents the full account creation form through the shared form composer, keeping fields, validation feedback, character counts, and actions consistent with other Cognis forms.

## Make invitation details easier to scan

Invitation expiry time now appears in a compact, non-live pill so its second-by-second updates do not repeatedly interrupt screen-reader users. The introduction and form cards also size themselves independently, so a long creation form no longer leaves an unnecessarily tall card on the left.

## Keep public pages free of account requests

Availability and presence reporting now queries the Auth gateway’s UI context capability instead of reading Auth-owned token storage, preventing public authentication pages from making account-only Social API requests without coupling Social Profile to an authentication provider.

## Preserve required-field emphasis

The Create Account form now leaves field presentation entirely to the shared form composer instead of applying registration or login style overrides, keeping required-field asterisks consistent in both light and dark themes.

## Commits

- [74cb218](https://github.com/Cognis-Labs-HQ/Cognis/commit/74cb218dfafdfd93dcfef2ca2928ac6657ff5245)
- [9cc4ed9](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cc4ed9c285c77d2901d2ea4cadb35b66af6ddc6)
- [1690cdb](https://github.com/Cognis-Labs-HQ/Cognis/commit/1690cdb58e8bcad63b60ef8beba367c3d0a03031)
- [a057317](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0573172b0549e663be0058f77b3af5aecc12432)
- [00fd542](https://github.com/Cognis-Labs-HQ/Cognis/commit/00fd5422)
