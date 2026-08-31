# Jitsi Share Approval

**Feature Branch:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet can use share approvals

The Share gateway now exposes its approval request orchestration as the `share:requestApproval` capability, including the caller-provided requester display name used by Jitsi Meet participant-addition approvals. This allows the module to enable successfully and use the existing participant approval flow.

## Approval prompts support contextual copy

Capability callers can provide an approval action and target, such as adding a participant to a named meeting. When omitted, prompts retain the existing share-link action and resource-type target.

## Implementation commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b7c97f73
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48c243e6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e28efff
