import type { NamespaceFileClient, StoredObject } from "@cognis/core";

/**
 * Narrow file-storage surface consumed by the profile adapter, backed by a
 * namespace-bound files gateway client for the 'profile' namespace. All object
 * writes are marked publicRead since avatars/banners are visible to any
 * authenticated viewer, not just the owner.
 */
export interface ProfileFileClient {
    store(
        actorId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    delete(actorId: string, key: string): Promise<boolean>;
}

export const PROFILE_NAMESPACE_ID = "profile";
const CALLER_COMPONENT = "social-profile";

export function createProfileFileClient(
    namespaceClient: NamespaceFileClient,
): ProfileFileClient {
    return {
        store: (actorId, content, contentType) =>
            namespaceClient.store({ actorId }, content, {
                contentType,
                publicRead: true,
            }),
        delete: (actorId, key) => namespaceClient.delete({ actorId }, key),
    };
}

export function createProfileNamespaceClientRequest(): {
    namespaceId: string;
    callerComponent: string;
} {
    return {
        namespaceId: PROFILE_NAMESPACE_ID,
        callerComponent: CALLER_COMPONENT,
    };
}
