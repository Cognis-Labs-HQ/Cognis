import { uiCtx } from "../../../ui-ctx.js";
import { mountProvider } from "../../../../layouts/tutorials.js";

let lifetime;
let dispose;

export async function mountWorkspace() {
    lifetime?.abort();
    dispose?.();
    lifetime = new AbortController();
    localStorage.setItem("cognis_account", "workspace-browser");
    localStorage.setItem("cognis_role", "admin");
    uiCtx.capabilities.contribute("session:isAuthenticated", () => true);
    history.replaceState(null, "", "/dashboard");
    dispose = await mountProvider({
        capabilities: uiCtx.capabilities,
        signal: lifetime.signal,
    });
    const session = await uiCtx.capabilities
        .get("ui:workspaceTutorial")
        .start({ firstTime: true });
    await session.ready;
    return session.state();
}
