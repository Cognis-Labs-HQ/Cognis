import type { StoredObject } from "@cognis/core";

/**
 * Narrow file-storage surface consumed by the profile adapter, backed by the
 * files gateway's namespaced `files:store`/`files:delete` capabilities bound
 * to the "profile" namespace. All object writes are marked publicRead since
 * the profile namespace is broadly readable (avatars/banners are visible to
 * any authenticated viewer, not just the owner).
 */
export interface ProfileFileClient {
    store(
        actorId: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<StoredObject>;
    delete(actorId: string, key: string): Promise<boolean>;
}

type FilesStoreCapability = (
    namespaceId: string,
    access: { actorId: string; callerComponent: string },
    content: Uint8Array,
    options?: { contentType?: string; publicRead?: boolean },
) => Promise<StoredObject>;

type FilesDeleteCapability = (
    namespaceId: string,
    access: { actorId: string; callerComponent: string },
    key: string,
) => Promise<boolean>;

export const PROFILE_NAMESPACE_ID = "profile";
const CALLER_COMPONENT = "social-profile";

export function createProfileFileClient(
    filesStore: FilesStoreCapability,
    filesDelete: FilesDeleteCapability,
): ProfileFileClient {
    return {
        store: (actorId, content, contentType) =>
            filesStore(
                PROFILE_NAMESPACE_ID,
                { actorId, callerComponent: CALLER_COMPONENT },
                content,
                { contentType, publicRead: true },
            ),
        delete: (actorId, key) =>
            filesDelete(
                PROFILE_NAMESPACE_ID,
                { actorId, callerComponent: CALLER_COMPONENT },
                key,
            ),
    };
}
