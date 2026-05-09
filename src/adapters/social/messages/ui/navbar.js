import { apiFetch } from "/static/reuse/api-client.js";

const messagesLink = document.querySelector("[data-messages-link]");
if (messagesLink) {
    apiFetch("/api/v1/messages/ping")
        .then((response) => {
            if (response.ok) messagesLink.removeAttribute("hidden");
        })
        .catch(() => {});
}
