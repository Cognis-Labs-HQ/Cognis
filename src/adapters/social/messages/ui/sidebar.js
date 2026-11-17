import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import { renderRoomList } from "./room-render.js";

/** @param {object} options Room state, localization and mount lifetime. @returns {Promise<string>} Sidebar content for the Composer toolbar. */
export async function renderMessagesSidebar({ signal, i18n, ...roomOptions }) {
    const response = await fetch(
        "/static/adapters/social/messages/templates/sidebar.html",
        { signal },
    );
    if (!response.ok) throw new Error("messages_sidebar_template_failed");
    return formatTemplate(await response.text(), {
        new_label: escapeHtml(i18n.t("module.social.messages.new")),
        templates_label: escapeHtml(i18n.t("module.social.messages.templates")),
        rooms: renderRoomList({ ...roomOptions, i18n }),
    });
}
