import { uiCtx } from "/static/reuse/ui-ctx.js";
import { profileUiClient } from "./client.js";
import { ensureProfileAvatarStyles } from "./profile-avatar.js";

await ensureProfileAvatarStyles();

uiCtx.capabilities.contribute("social:profileUiClient", profileUiClient);
