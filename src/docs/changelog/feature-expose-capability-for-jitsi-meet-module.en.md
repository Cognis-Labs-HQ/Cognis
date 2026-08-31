# Jitsi Share Approval

**Feature Branch:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet can use share approvals

The Share gateway now exposes its approval request orchestration as the `share:requestApproval` capability, including the caller-provided requester display name used by Jitsi Meet participant-addition approvals. This allows the module to enable successfully and use the existing participant approval flow.

## Implementation commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cd8a5d46
