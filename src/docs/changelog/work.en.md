# Jitsi Share Approval

## Jitsi Meet can use share approvals

The Share gateway now exposes its approval request orchestration as the `share:requestApproval` capability, including the caller-provided requester display name used by Jitsi Meet participant-addition approvals. This allows the module to enable successfully and use the existing participant approval flow.

**Feature Branch:** work

## Implementation commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/c8f62831
- https://github.com/Cognis-Labs-HQ/Cognis/commit/4fc46aaf
