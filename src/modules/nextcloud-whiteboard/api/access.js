import { normalizeHandleKey } from "../../../api/reuse/normalize-handle.js";
import { NextcloudWhiteboardStore } from "./store.js";

const PAGE_RESOURCE_ORIGIN_OWNER_ID = "module:nextcloud-whiteboard";

const storeByExecutor = new WeakMap();

export function resolveStore(dbExecutor, log) {
    const existingStore = storeByExecutor.get(dbExecutor);
    if (existingStore) return existingStore;
    const store = new NextcloudWhiteboardStore({ db: dbExecutor, log });
    storeByExecutor.set(dbExecutor, store);
    return store;
}

export function createProfileStoreCapability(ctx) {
    const requireProfileStore = () => {
        const profileStore = ctx.getCapability("social:profileStore");
        if (!profileStore) {
            throw new Error("Profile store capability is unavailable.");
        }
        return profileStore;
    };
    return {
        getProfile(...args) {
            return requireProfileStore().getProfile(...args);
        },
        getProfileByHandle(...args) {
            return requireProfileStore().getProfileByHandle(...args);
        },
    };
}

export async function resolveRequesterUsername(profileStore, accountId) {
    const profile = await profileStore.getProfile(accountId);
    const username = normalizeHandleKey(profile?.handle ?? "");
    if (!username) {
        throw new Error(
            "A visible profile handle is required to use Whiteboards.",
        );
    }
    return username;
}

export async function resolveParticipantHandles(
    profileStore,
    requestedHandles,
    includeHidden,
) {
    const usernames = [];
    for (const candidate of Array.isArray(requestedHandles)
        ? requestedHandles
        : []) {
        const normalizedHandle = normalizeHandleKey(candidate);
        if (!normalizedHandle) continue;
        const profile = await profileStore.getProfileByHandle(normalizedHandle);
        if (!profile?.handle) continue;
        if (!includeHidden && profile.visibility === "hidden") continue;
        usernames.push(normalizeHandleKey(profile.handle));
    }
    return usernames;
}

export function buildCognisWhiteboardUrl(
    whiteboardId,
    { instantCanvas = false } = {},
) {
    const params = new URLSearchParams({ id: whiteboardId });
    if (instantCanvas) params.set("instantCanvas", "1");
    return `/whiteboard?${params.toString()}`;
}

export async function resolveWhiteboardUserAccess({
    claims,
    profileStore,
    store,
    whiteboardId,
    resolveShareGuestAccess,
    resolveShareUserAccess,
    requireWrite = false,
}) {
    if (typeof resolveShareGuestAccess === "function") {
        const shareAccess = await resolveShareGuestAccess({
            claims,
            resourceType: "whiteboard",
            resourceId: whiteboardId,
            requiredCapability: requireWrite
                ? "whiteboard:write"
                : "whiteboard:read",
        }).catch(() => null);
        if (shareAccess?.shareGuest) {
            return shareAccess.authorized
                ? {
                      authorized: true,
                      username: shareAccess.username,
                      displayName: shareAccess.displayName,
                  }
                : {
                      authorized: false,
                      status: 403,
                      code: "forbidden",
                      message:
                          "This share link cannot access the requested whiteboard.",
                  };
        }
    }
    if (typeof resolveShareUserAccess === "function") {
        const userShareAccess = await resolveShareUserAccess({
            accountId: claims.sub,
            resourceType: "whiteboard",
            resourceId: whiteboardId,
            requiredCapability: requireWrite
                ? "whiteboard:write"
                : "whiteboard:read",
        }).catch(() => null);
        if (userShareAccess?.authorized) {
            const username = await resolveRequesterUsername(
                profileStore,
                claims.sub,
            ).catch(() => "");
            return username
                ? { authorized: true, username }
                : {
                      authorized: false,
                      status: 409,
                      code: "profile_required",
                      message:
                          "A visible profile handle is required to use Whiteboards.",
                  };
        }
    }
    const username = await resolveRequesterUsername(
        profileStore,
        claims.sub,
    ).catch((error) => ({ error }));
    if (username?.error)
        return {
            authorized: false,
            status: 409,
            code: "profile_required",
            message: username.error.message,
        };
    const authorized = await store.canAccessWhiteboard(whiteboardId, username);
    return authorized
        ? { authorized: true, username }
        : {
              authorized: false,
              status: 403,
              code: "forbidden",
              message:
                  "You are not listed as an allowed whiteboard participant.",
          };
}

export function registerConfiguredOrigin(registerScriptOrigins, config) {
    if (typeof registerScriptOrigins === "function") {
        registerScriptOrigins(PAGE_RESOURCE_ORIGIN_OWNER_ID, [
            config?.serverUrl,
        ]);
    }
}

export async function registerStoredOrigin({
    store,
    registerScriptOrigins,
    log,
}) {
    try {
        await store.ensureSchema();
        registerConfiguredOrigin(
            registerScriptOrigins,
            await store.getConfig(),
        );
    } catch (error) {
        log?.(
            "error",
            "Failed to register stored Nextcloud Whiteboard CSP origin.",
            {
                component: "nextcloud-whiteboard-module",
                operation: "register_stored_origin",
                error: error instanceof Error ? error.message : String(error),
            },
        );
    }
}
