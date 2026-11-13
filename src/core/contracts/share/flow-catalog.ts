import { createFlowContract } from "../flow-contract.js";

export const SHARE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "prepare-share-method",
        owner: "share",
        description:
            "Delegates method-specific share input normalization to a Share gateway adapter.",
        stages: [
            {
                id: "prepare-method",
                description:
                    "Validate and normalize the selected adapter's implementation-specific share input.",
            },
        ],
    }),
    createFlowContract({
        id: "mint-share-token",
        owner: "share",
        description:
            "Creates a share token through staged resource validation, authorization, issuance, and event fan-out.",
        stages: [
            {
                id: "validate-resource",
                description:
                    "Resolve the target resource and validate that it can participate in the share flow.",
            },
            {
                id: "authorize-minter",
                description:
                    "Confirm the caller may mint share tokens for the resolved resource and requested capabilities.",
            },
            {
                id: "request-approval",
                description:
                    "Prompt other users attached to the resource for approval before a share link is minted, auto-approving after a 60-second timeout.",
            },
            {
                id: "issue-token",
                description:
                    "Persist the canonical share token record and return the generated public share URL.",
            },
            {
                id: "emit-event",
                description:
                    "Emit share creation side effects such as audit logs, notifications, or telemetry.",
            },
        ],
    }),
    createFlowContract({
        id: "resolve-share-token",
        owner: "share",
        description:
            "Resolves a public share token into a curated, unauthenticated resource payload for share rendering.",
        stages: [
            {
                id: "validate-token",
                description:
                    "Validate the share token format, expiry, and persisted gateway-owned token record.",
            },
            {
                id: "resolve-resource",
                description:
                    "Resolve the backing resource and owner-facing metadata declared by the owning component.",
            },
            {
                id: "check-access",
                description:
                    "Apply resource-specific access rules before exposing any unauthenticated share payload.",
            },
            {
                id: "issue-guest-token",
                description:
                    "Issue a scoped guest access token for share-allowed API reads in the resolved resource context.",
            },
            {
                id: "build-payload",
                description:
                    "Assemble the final public payload consumed by the share page renderer.",
            },
            {
                id: "deliver-recipient",
                description:
                    "Deliver an authenticated user share to its owning component and return its account navigation target.",
            },
        ],
    }),
    createFlowContract({
        id: "update-share-token",
        owner: "share",
        description:
            "Updates a share token and reconciles recipient-side deliveries through staged authorization and lifecycle hooks.",
        stages: [
            {
                id: "authorize-update",
                description:
                    "Load the existing token and confirm the caller owns the share being updated.",
            },
            {
                id: "update-token",
                description:
                    "Persist the canonical share token changes in the Share gateway.",
            },
            {
                id: "reconcile-deliveries",
                description:
                    "Synchronize already-delivered recipient resources with the updated recipients, permissions, and expiry.",
            },
        ],
    }),
    createFlowContract({
        id: "revoke-share-token",
        owner: "share",
        description:
            "Revokes an existing share token through staged authorization and deletion.",
        stages: [
            {
                id: "authorize-revocation",
                description:
                    "Confirm the caller may revoke the requested share token for the target resource.",
            },
            {
                id: "delete-token",
                description:
                    "Delete or mark the token inactive in the owning share token registry.",
            },
            {
                id: "remove-delivery",
                description:
                    "Remove recipient-side objects delivered by the revoked share.",
            },
        ],
    }),
    createFlowContract({
        id: "construct-share-page",
        owner: "share",
        description:
            "Builds the share page shell and resource renderer metadata through staged composition.",
        stages: [
            {
                id: "resolve-shell",
                description:
                    "Declare share-page shell framing, page context, and capability-driven display requirements.",
            },
            {
                id: "resolve-resource-renderer",
                description:
                    "Resolve the client renderer module and resource presentation metadata for the share payload.",
            },
        ],
    }),
    createFlowContract({
        id: "resolve-share-approval-targets",
        owner: "share",
        description:
            "Resolves the other users attached to a resource who must approve creation of a new share link for it.",
        stages: [
            {
                id: "resolve-targets",
                description:
                    "Declare the account IDs (excluding the requester) that must approve or decline this share link.",
            },
        ],
    }),
    createFlowContract({
        id: "resolve-share-delegated-access",
        owner: "share",
        description:
            "Resolves whether a guest share for one resource delegates a capability to another resource.",
        stages: [
            {
                id: "resolve-delegation",
                description:
                    "Allow resource owners to prove a source-to-target relationship and declare its delegated capabilities.",
            },
        ],
    }),
]);
