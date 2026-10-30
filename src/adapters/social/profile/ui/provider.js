import { mountAvailability } from "./availability.js";
import { registerProfileOfflineClient } from "./offline-client.js";
import { profileUiClient } from "./client.js";
import { ensureProfileAvatarStyles } from "./profile-avatar.js";

export async function mountProvider(uiCtx) {
    registerProfileOfflineClient(uiCtx);
    await ensureProfileAvatarStyles();
    uiCtx.signal.throwIfAborted();
    uiCtx.capabilities.contribute("social:profileUiClient", profileUiClient);
    return mountAvailability(uiCtx);
}
