import { renderComponentsContent } from "../../render-components.js";
import { guides } from "../../guides.js";
import { createI18n } from "../../../../reuse/i18n.js";
import { escapeHtml } from "../../../../reuse/escape-html.js";
import { ensurePersistentStylesheet } from "../../../../reuse/page-styles.js";

let lifetime;

/** Exercise the owning component's real renderer and authored tutorial through the host contract. */
export async function mountComponentExample(api, { editable = true } = {}) {
    lifetime?.abort();
    lifetime = new AbortController();
    document.querySelector("#components")?.remove();
    localStorage.setItem("cognis_role", "admin");
    history.replaceState(null, "", "/administration");
    await ensurePersistentStylesheet("/static/styles/page-builder/admin.css");
    const i18n = await createI18n();
    const panel = document.createElement("section");
    panel.id = "components";
    const gateways = [
        {
            id: "required",
            name: i18n.t("ui.app.admin.gateways"),
            required: true,
            version: "1",
        },
        {
            id: "hidden",
            name: i18n.t("ui.app.admin.gateways"),
            required: false,
            version: "1",
        },
        {
            id: "editable",
            name: i18n.t("ui.app.admin.gateways"),
            required: !editable,
            version: "1",
        },
    ];
    panel.innerHTML = renderComponentsContent([], gateways, [], {
        i18n,
        escapeHtml,
        healthStatus: {},
    });
    panel.querySelector('[data-gateway="hidden"]').hidden = true;
    document.querySelector("main").append(panel);
    await api.mountPage({
        owner: "ui.administration",
        root: document.querySelector("main"),
        signal: lifetime.signal,
        i18n,
        definitions: [guides[0].definitions[0]],
    });
    const session = await api.start("ui.administration:components", {
        firstTime: true,
    });
    await session.ready;
    return session.state();
}
