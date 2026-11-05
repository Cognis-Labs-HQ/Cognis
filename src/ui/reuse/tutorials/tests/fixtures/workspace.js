import { createSearchBar } from "../../../search-util/popup.js";
import { ensurePersistentStylesheet } from "../../../page-styles.js";
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
    await ensurePersistentStylesheet("/static/styles/reuse/search-bar.css");
    document.querySelector("#global-search-wrap").replaceChildren(
        createSearchBar({
            endpoint: "/api/v1/search",
            localGroups: [
                {
                    category: "Pages",
                    items: [
                        { id: "settings", label: "Settings", url: "/settings" },
                    ],
                },
            ],
            onSelect: (result) => {
                window.selectedSearchResult = result;
            },
        }),
    );
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
