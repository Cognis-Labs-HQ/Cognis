import { createSearchBar } from "../../../search-util/popup.js";
import { ensurePersistentStylesheet } from "../../../page-styles.js";
import { loadTemplate } from "../../../template-loader.js";
import { applyStaticTranslations, createI18n } from "../../../i18n.js";
import { uiCtx } from "../../../ui-ctx.js";
import { bindAccountMenu } from "../../../../layouts/user-menu.js";
import { mountProvider } from "../../../../layouts/tutorials.js";

let lifetime;
let dispose;

export async function mountWorkspace({
    role = "admin",
    firstTime = true,
    notifications = true,
    autoMenuLifetime = false,
    language = true,
    editable = true,
} = {}) {
    lifetime?.abort();
    dispose?.();
    lifetime = new AbortController();
    localStorage.setItem("cognis_account", "workspace-browser");
    localStorage.setItem("cognis_role", role);
    localStorage.setItem("cognis_access_token", "fixture-session");
    uiCtx.capabilities.contribute("session:isAuthenticated", () => true);
    history.replaceState(null, "", "/dashboard");
    await Promise.all([
        ensurePersistentStylesheet("/static/styles/reuse/search-bar.css"),
        ensurePersistentStylesheet("/static/styles/reuse/layout.css"),
    ]);
    const template = new DOMParser().parseFromString(
        await loadTemplate("dashboard-layout"),
        "text/html",
    );
    const header = document.createElement("header");
    header.className = "site-header";
    header.append(template.querySelector(".global-navrow").cloneNode(true));
    document.body.prepend(header);
    const dock = template
        .querySelector("[data-page-action-dock]")
        .cloneNode(true);
    dock.querySelectorAll("button").forEach((button) => {
        button.hidden = false;
    });
    dock.querySelector("#language-toggle").hidden = !language;
    dock.querySelector("#composer-edit-toggle").hidden = !editable;
    document.body.append(dock);
    document.body.append(
        template.querySelector(".global-footer").cloneNode(true),
    );
    document.querySelector("main").classList.add("main-window");
    const i18n = await createI18n();
    applyStaticTranslations(i18n, header);
    applyStaticTranslations(i18n, dock);
    header.querySelectorAll(".admin-only").forEach((element) => {
        element.hidden = role !== "admin";
    });
    header.querySelectorAll(".teacher-only").forEach((element) => {
        element.hidden = role !== "admin" && role !== "teacher";
    });
    bindAccountMenu({
        toggle: header.querySelector("#profile-toggle"),
        dropdown: header.querySelector("#profile-dropdown"),
        menu: header.querySelector(".profile-menu"),
        signal: autoMenuLifetime ? undefined : lifetime.signal,
    });
    window.fixtureLogoutCalls = 0;
    header
        .querySelector("#profile-logout")
        .addEventListener("click", () => window.fixtureLogoutCalls++, {
            signal: lifetime.signal,
        });
    header.querySelector("#global-search-wrap").append(
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
    if (notifications) {
        await import("/static/gateways/notify-internal/navbar-plugin.js");
        for (
            let attempt = 0;
            attempt < 150 && !document.querySelector("#notification-toggle");
            attempt++
        )
            await new Promise((resolve) => setTimeout(resolve, 20));
        if (!document.querySelector("#notification-toggle"))
            throw new Error("fixture_notifications_unavailable");
    }
    dispose = await mountProvider({
        capabilities: uiCtx.capabilities,
        signal: lifetime.signal,
    });
    const session = await uiCtx.capabilities
        .get("ui:workspaceTutorial")
        .start({ firstTime });
    await session.ready;
    await uiCtx.runFlow("page:mounted", {
        pathname: window.location.pathname,
        signal: lifetime.signal,
    });
    await uiCtx.capabilities.get("ui:tutorials").refreshPage();
    return session.state();
}
