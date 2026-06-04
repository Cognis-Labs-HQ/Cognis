import type { AccountProfile, ProfileStore } from "../profile-store.js";
import type {
    BootstrapLog,
    FileStorageGateway,
    FlowApi,
    FlowRunResult,
} from "@cognis/core";

type ProfileMediaKey = "avatarKey" | "bannerKey";

export type ProfileMediaMutationResult = {
    persisted: boolean;
    removed?: boolean;
    updated?: AccountProfile | null;
    storedKey?: string;
    reason?: string;
};

export async function replaceProfileMedia(
    profileStore: ProfileStore,
    fileGateway: FileStorageGateway,
    accountId: string,
    key: ProfileMediaKey,
    content: Uint8Array,
    contentType: string,
    onPreviousDeleteError?: (error: unknown, previousKey: string) => void,
): Promise<{ updated: AccountProfile; storedKey: string } | null> {
    const existing = await profileStore.getProfile(accountId);
    if (!existing) return null;
    const previousKey = existing[key];
    const stored = await fileGateway.store(accountId, content, contentType);
    let updated: AccountProfile | null = null;
    try {
        updated = await profileStore.updateProfile(accountId, {
            [key]: stored.key,
        } as Partial<Pick<AccountProfile, ProfileMediaKey>>);
    } catch (error) {
        await fileGateway.delete(stored.key);
        throw error;
    }
    if (!updated) {
        await fileGateway.delete(stored.key);
        return null;
    }
    if (previousKey && previousKey !== stored.key) {
        try {
            await fileGateway.delete(previousKey);
        } catch (error) {
            onPreviousDeleteError?.(error, previousKey);
        }
    }
    return { updated, storedKey: stored.key };
}

export function getFirstStageResult<T>(
    flowResult: FlowRunResult,
    stageId: string,
): T | undefined {
    const stageResults = flowResult.stageResults[stageId];
    if (!Array.isArray(stageResults) || stageResults.length === 0) {
        return undefined;
    }
    return stageResults[0] as T;
}

export function registerProfileMediaFlowHooks(input: {
    flow: FlowApi;
    profileStore: ProfileStore;
    fileGateway: FileStorageGateway;
    log?: BootstrapLog;
    onProfileChanged?: (payload: {
        accountId: string;
        handle?: string | null;
        displayName?: string | null;
        displayNameChanged?: boolean;
        avatarChanged?: boolean;
    }) => Promise<void>;
}): void {
    const { flow, profileStore, fileGateway, log, onProfileChanged } = input;

    if (flow.exists("upload-profile-media")) {
        flow.extend(
            "upload-profile-media",
            "persist-media",
            { id: "social-profile-adapter:persist-profile-media" },
            async (stageCtx) => {
                const payload = stageCtx.input as {
                    accountId?: unknown;
                    mediaField?: unknown;
                    content?: unknown;
                    contentType?: unknown;
                };
                const accountId = String(payload.accountId ?? "");
                const mediaField = String(payload.mediaField ?? "");
                const contentType = String(payload.contentType ?? "");
                const content = payload.content;

                if (
                    !accountId ||
                    !contentType ||
                    !(content instanceof Uint8Array)
                ) {
                    return {
                        persisted: false,
                        reason: "invalid_upload_payload",
                    };
                }
                if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                    return {
                        persisted: false,
                        reason: "invalid_media_field",
                    };
                }

                const result = await replaceProfileMedia(
                    profileStore,
                    fileGateway,
                    accountId,
                    mediaField,
                    content,
                    contentType,
                    (error, previousKey) => {
                        log?.(
                            "warn",
                            `Failed to delete replaced ${mediaField === "avatarKey" ? "avatar" : "banner"} file.`,
                            {
                                component: "social-profile-adapter",
                                accountId,
                                previousKey,
                                error:
                                    error instanceof Error
                                        ? error.message
                                        : String(error),
                            },
                        );
                    },
                );

                if (!result) {
                    return { persisted: false, reason: "profile_not_found" };
                }

                return {
                    persisted: true,
                    storedKey: result.storedKey,
                    updated: result.updated,
                };
            },
        );

        flow.extend(
            "upload-profile-media",
            "emit-events",
            { id: "social-profile-adapter:emit-profile-media-upload-events" },
            async (stageCtx) => {
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        {
                            flowId: stageCtx.flowId,
                            data: stageCtx.data,
                            stageResults: stageCtx.stageResults,
                        },
                        "persist-media",
                    );
                if (!persistResult?.persisted || !persistResult.updated) {
                    return { emitted: false };
                }
                const mediaField = String(
                    (stageCtx.input as Record<string, unknown>).mediaField ??
                        "",
                );
                if (mediaField === "avatarKey") {
                    await onProfileChanged?.({
                        accountId: persistResult.updated.accountId,
                        handle: persistResult.updated.handle,
                        displayName: persistResult.updated.displayName,
                        avatarChanged: true,
                    });
                }
                return { emitted: true };
            },
        );
    }

    if (flow.exists("remove-profile-media")) {
        flow.extend(
            "remove-profile-media",
            "persist-removal",
            { id: "social-profile-adapter:persist-profile-media-removal" },
            async (stageCtx) => {
                const payload = stageCtx.input as {
                    accountId?: unknown;
                    mediaField?: unknown;
                };
                const accountId = String(payload.accountId ?? "");
                const mediaField = String(payload.mediaField ?? "");
                if (!accountId) {
                    return {
                        persisted: false,
                        reason: "invalid_removal_payload",
                    };
                }
                if (mediaField !== "avatarKey" && mediaField !== "bannerKey") {
                    return {
                        persisted: false,
                        reason: "invalid_media_field",
                    };
                }

                const profile = await profileStore.getProfile(accountId);
                if (!profile) {
                    return { persisted: false, reason: "profile_not_found" };
                }
                const existingKey = profile[mediaField];
                if (existingKey) {
                    await fileGateway.delete(existingKey);
                }
                const updated = await profileStore.updateProfile(accountId, {
                    [mediaField]: null,
                } as Partial<Pick<AccountProfile, ProfileMediaKey>>);
                return {
                    persisted: true,
                    removed: true,
                    storedKey: existingKey ?? undefined,
                    updated: updated ?? profile,
                };
            },
        );

        flow.extend(
            "remove-profile-media",
            "emit-events",
            { id: "social-profile-adapter:emit-profile-media-removal-events" },
            async (stageCtx) => {
                const persistResult =
                    getFirstStageResult<ProfileMediaMutationResult>(
                        {
                            flowId: stageCtx.flowId,
                            data: stageCtx.data,
                            stageResults: stageCtx.stageResults,
                        },
                        "persist-removal",
                    );
                if (!persistResult?.persisted || !persistResult.updated) {
                    return { emitted: false };
                }
                const mediaField = String(
                    (stageCtx.input as Record<string, unknown>).mediaField ??
                        "",
                );
                if (mediaField === "avatarKey") {
                    await onProfileChanged?.({
                        accountId: persistResult.updated.accountId,
                        handle: persistResult.updated.handle,
                        displayName: persistResult.updated.displayName,
                        avatarChanged: true,
                    });
                }
                return { emitted: true };
            },
        );
    }
}
