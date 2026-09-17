export interface ExternalProfileMedia {
    content: Uint8Array;
    contentType?: string;
}

export interface ExternalAccountProfile {
    handle?: string;
    displayName?: string;
    bio?: string;
    location?: string;
    website?: string;
    avatar?: ExternalProfileMedia;
    banner?: ExternalProfileMedia;
}

export interface ExternalProfileRequest {
    providerId: string;
    accountId: string;
    externalUserId: string;
    session: Record<string, unknown>;
}

export type ExternalProfileResolver = (
    request: ExternalProfileRequest,
) => Promise<ExternalAccountProfile | null>;

export function createExternalProfileRegistry() {
    const resolvers = new Map<string, ExternalProfileResolver>();
    return {
        register(providerId: string, resolver: ExternalProfileResolver) {
            const normalizedId = providerId.trim();
            if (!normalizedId || resolvers.has(normalizedId)) {
                throw new Error("external_profile_provider_already_registered");
            }
            resolvers.set(normalizedId, resolver);
            return () => resolvers.delete(normalizedId);
        },
        async resolve(request: ExternalProfileRequest) {
            return (await resolvers.get(request.providerId)?.(request)) ?? null;
        },
    };
}
