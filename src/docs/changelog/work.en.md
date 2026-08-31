# Harden and stage Share approvals

**Feature Branch:** work

## Escape approval popup context

Approval requester, action, and target values are now HTML-escaped before they are rendered in an approver's dashboard.

## Expose approval orchestration as a flow

The Share approval capability now runs a named flow with explicit target resolution, request creation, response waiting, and decision stages so components can inject removable hooks.

## Implementation commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/1452294f
