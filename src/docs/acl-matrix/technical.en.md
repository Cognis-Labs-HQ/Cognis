# Technical Reference

The public interfaces and operational rules of ACL Matrix.

## Interfaces

`AccessRole` and `RoleAccessPolicy` are exported by Core. `hasMinRole(role, minRole)` compares the canonical rank; `isRoleAllowed(role, { minRole, onlyRole })` enforces both constraints. Authentication guards resolve the current claims before applying route policy.

## Configuration

`minRole` permits the named role and higher ranks. `onlyRole` permits exactly the named role, including when the caller has a higher rank. Resource owners add ownership, visibility, membership or delegated-share checks separately.

## Behavior

The ordered roles are `user < teacher < moderator < admin < owner`. Self-registration creates `user`; `founder` is not an AccessRole and invitation eligibility must be checked through Registration policy. A minimum role is not a complete permission matrix: private profiles, files, rooms and classrooms enforce their own access conditions.

## Security

Check role and resource access at execution time. A hidden control is not an authorization boundary; a broad role description must not override a stricter onlyRole policy or current membership checks.

## Reference

- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/core/contracts/access-policy.ts)
- [src/gateways/auth/guard.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/gateways/auth/guard.ts)
