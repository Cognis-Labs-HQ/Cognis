import "../../../feedback-capabilities.js";
import { ensureUiProvidersLoaded } from "../../../ui-provider-loader.js";
import { uiCtx } from "../../../ui-ctx.js";

try {
    await ensureUiProvidersLoaded();
    document.body.dataset.recoveryReady = "true";
    document.body.dataset.healthy = String(
        uiCtx.capabilities.get("fixture:healthy")?.() === true,
    );
    document.body.dataset.repaired = String(
        uiCtx.capabilities.get("fixture:repaired")?.() === true,
    );
} catch (error) {
    document.body.dataset.recoveryError = error.message;
}
