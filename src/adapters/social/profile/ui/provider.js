import { registerProfileOfflineClient } from "./offline-client.js";
import { profileUiClient } from "./client.js";
import { ensureProfileAvatarStyles } from "./profile-avatar.js";

export async function mountProvider(uiCtx) {
    await ensureProfileAvatarStyles();
    registerProfileOfflineClient(uiCtx);
    uiCtx.capabilities.contribute("social:profileUiClient", profileUiClient);
}
