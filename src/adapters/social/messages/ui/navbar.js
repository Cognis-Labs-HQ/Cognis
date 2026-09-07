import { apiFetch } from "/static/reuse/api-client.js";
import { registerSearchIndexing } from "./search/index.js";
import "./chat-loading.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { messagesUiClient } from "./client.js";

uiCtx.capabilities.contribute("social:messagesUiClient", messagesUiClient);

async function syncMessagesLink() {
    const messagesLink = document.querySelector("[data-messages-link]");
    if (!messagesLink) return;
    try {
        const response = await apiFetch("/api/v1/social/messages/ping");
        if (response.ok) {
            messagesLink.removeAttribute("hidden");
            return;
        }
    } catch {
        // Best-effort navbar contribution; keep the link hidden when probing fails.
    }
    messagesLink.setAttribute("hidden", "");
}

syncMessagesLink();
window.addEventListener("focus", syncMessagesLink);
window.addEventListener("cognis:navbar-refresh", syncMessagesLink);

registerSearchIndexing();
