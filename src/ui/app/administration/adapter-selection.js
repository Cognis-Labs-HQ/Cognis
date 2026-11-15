import { escapeHtml } from "../../reuse/escape-html.js";
import { formatTemplate } from "../../reuse/format-template.js";

/** Render the gateway's current optional adapters using owned static templates. @returns {Promise<string>} */
export async function renderAdapterSelection(adapters, i18n, { signal } = {}) {
    const templates = await Promise.all(
        [
            "/static/templates/administration/adapter-selection.html",
            "/static/templates/administration/adapter-option.html",
        ].map(async (path) => {
            const response = await fetch(path, { signal });
            if (!response.ok)
                throw new Error("administration_template_unavailable");
            return response.text();
        }),
    );
    const [selection, option] = templates;
    return formatTemplate(selection, {
        description: escapeHtml(
            i18n.t("ui.app.admin.enable_gateway_select_adapters"),
        ),
        options: adapters
            .map((adapter) => {
                const id = adapter.senderId ?? adapter.id;
                return formatTemplate(option, {
                    id: escapeHtml(id),
                    name: escapeHtml(adapter.name ?? id),
                });
            })
            .join(""),
    });
}
