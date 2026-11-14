import { mountProfilePreviews } from "./profile-preview.js";
import { mountAvailability } from "./availability.js";
import { registerProfileOfflineClient } from "./offline-client.js";
import { profileUiClient } from "./client.js";
import {
    ensureProfileAvatarStyles,
    mountProfileAvatarRenderer,
} from "./profile-avatar.js";

export async function mountProvider(uiCtx) {
    registerProfileOfflineClient(uiCtx);
    await ensureProfileAvatarStyles();
    uiCtx.signal.throwIfAborted();
    mountProfileAvatarRenderer(uiCtx);
    mountProfilePreviews(uiCtx);
    uiCtx.capabilities.contribute("social:profileUiClient", profileUiClient);
    return mountAvailability(uiCtx);
}
