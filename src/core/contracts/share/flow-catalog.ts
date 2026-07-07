import { createFlowContract } from '../flow-contract.js';

export const SHARE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: 'mint-share-token',
        owner: 'share',
        description:
            'Creates a share token through staged resource validation, authorization, issuance, and event fan-out.',
        stages: [
            {
                id: 'validate-resource',
                description:
                    'Resolve the target resource and validate that it can participate in the share flow.',
            },
            {
                id: 'authorize-minter',
                description:
                    'Confirm the caller may mint share tokens for the resolved resource and requested capabilities.',
            },
            {
                id: 'issue-token',
                description:
                    'Persist the canonical share token record and return the generated public share URL.',
            },
            {
                id: 'emit-event',
                description:
                    'Emit share creation side effects such as audit logs, notifications, or telemetry.',
            },
        ],
    }),
    createFlowContract({
        id: 'resolve-share-token',
        owner: 'share',
        description:
            'Resolves a public share token into a curated, unauthenticated resource payload for share rendering.',
        stages: [
            {
                id: 'validate-token',
                description:
                    'Validate the share token format, expiry, and persisted gateway-owned token record.',
            },
            {
                id: 'resolve-resource',
                description:
                    'Resolve the backing resource and owner-facing metadata declared by the owning component.',
            },
            {
                id: 'check-access',
                description:
                    'Apply resource-specific access rules before exposing any unauthenticated share payload.',
            },
            {
                id: 'build-payload',
                description:
                    'Assemble the final public payload consumed by the share page renderer.',
            },
        ],
    }),
    createFlowContract({
        id: 'revoke-share-token',
        owner: 'share',
        description:
            'Revokes an existing share token through staged authorization and deletion.',
        stages: [
            {
                id: 'authorize-revocation',
                description:
                    'Confirm the caller may revoke the requested share token for the target resource.',
            },
            {
                id: 'delete-token',
                description:
                    'Delete or mark the token inactive in the owning share token registry.',
            },
        ],
    }),
    createFlowContract({
        id: 'construct-share-page',
        owner: 'share',
        description:
            'Builds the share page shell and resource renderer metadata through staged composition.',
        stages: [
            {
                id: 'resolve-shell',
                description:
                    'Declare share-page shell framing, page context, and capability-driven display requirements.',
            },
            {
                id: 'resolve-resource-renderer',
                description:
                    'Resolve the client renderer module and resource presentation metadata for the share payload.',
            },
        ],
    }),
]);
