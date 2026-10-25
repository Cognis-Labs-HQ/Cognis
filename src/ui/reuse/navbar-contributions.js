import { uiCtx } from "./ui-ctx.js";

const links = new Map();

function renderLinks() {
    const navbar = document.querySelector(".topnav");
    if (!navbar) return;
    for (const [id, link] of links) {
        let element = navbar.querySelector(
            `[data-navbar-contribution="${CSS.escape(id)}"]`,
        );
        if (!element) {
            element = document.createElement("a");
            element.dataset.navbarContribution = id;
            navbar.append(element);
        }
        if (link.disabled === true) {
            element.removeAttribute("href");
            element.setAttribute("aria-disabled", "true");
        } else {
            element.href = link.href;
            if (!element.dataset.offlineDisabled)
                element.removeAttribute("aria-disabled");
        }
        if (link.title) element.setAttribute("title", link.title);
        else element.removeAttribute("title");
        element.textContent = link.label;
        element.hidden = link.visible === false;
    }
}

function contribute(id, link) {
    if (links.has(id)) throw new Error("navbar_contribution_conflict");
    if (!id || !link?.label || !/^\/(?!\/)/.test(link?.href ?? ""))
        throw new TypeError("invalid_navbar_contribution");
    links.set(id, link);
    renderLinks();
    return () => {
        if (links.get(id) !== link) return;
        links.delete(id);
        document
            .querySelectorAll(`[data-navbar-contribution="${CSS.escape(id)}"]`)
            .forEach((element) => element.remove());
    };
}

uiCtx.capabilities.contribute("ui:navbarLinks", {
    contribute,
    render: renderLinks,
});
if (typeof window !== "undefined")
    window.addEventListener("cognis:navbar-refresh", renderLinks);
