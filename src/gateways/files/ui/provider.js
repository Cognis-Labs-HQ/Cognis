import { uiCtx } from "/static/reuse/ui-ctx.js";
import { filesUiClient } from "./client.js";

uiCtx.capabilities.contribute("files:uiClient", filesUiClient);
