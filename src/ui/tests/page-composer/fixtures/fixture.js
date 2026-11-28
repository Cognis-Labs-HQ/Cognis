import {
    createModuleFilters,
    renderModuleFilters,
} from "/static/app/modules/filters.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n, applyStaticTranslations } from "/static/reuse/i18n.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-util/popup.js";
import { bindCompactNavigation } from "/static/layouts/compact-navigation.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

try {
    const scenarios = await (await fetch("/scenarios.json")).json();
    const options = new URLSearchParams(location.search);
    const scenario = scenarios[options.get("scenario") ?? "default"];
    document.documentElement.lang = options.get("lang") ?? "en";
    const i18n = await createI18n({
        preferredLanguages: [document.documentElement.lang],
        componentStringBaseUrls: options.has("module-sidebar")
            ? ["/static/app/modules/languages"]
            : [],
    });
    const root = document.querySelector("#app");
    const lifetime = new AbortController();
    localStorage.setItem("cognis_account", "fixture");
    localStorage.setItem("cognis_access_token", "fixture-noncredential");
    function renderTemplate(id) {
        const content = document
            .querySelector(`#${id}`)
            .content.cloneNode(true);
        applyStaticTranslations(i18n, content);
        const paragraph = content.querySelector("[data-fixture-paragraph]");
        if (paragraph)
            paragraph.textContent = Array(120)
                .fill(i18n.t("ui.reuse.more_information"))
                .join(" ");
        const container = document.createElement("div");
        container.append(content);
        return container.innerHTML;
    }
    const elements = scenario.map((element) => ({
        ...element,
        label: i18n.t("ui.reuse.settings"),
        render: () => renderTemplate(element.template),
    }));
    const nested = options.get("mode") === "nested";
    const menus = options.has("menus");
    const menuChoices = [];
    const menu = createSideMenu({
        groups: [
            {
                id: "fixture",
                collapsible: false,
                items: [
                    { id: "first", label: i18n.t("ui.reuse.settings") },
                    {
                        id: "second",
                        label: i18n.t("ui.reuse.more_information"),
                    },
                ],
            },
        ],
        storageKeyPrefix: "fixture-menu",
        onSelect: (id) => menuChoices.push(id),
    });
    const composer = createPageComposer(root, {
        i18n,
        preferenceKey: nested ? "responsive-nested" : "responsive-grid",
        allowCustomization: !nested,
        frameless: options.has("frameless"),
        requireAccountSession: false,
        enableAccountEnhancements: false,
        toolbarScrollable: true,
        contentScrolling: !options.has("document-scroll"),
        signal: lifetime.signal,
        pageContext: {
            title: i18n.t("ui.reuse.settings"),
            subtitle: i18n.t("ui.reuse.more_information"),
        },
        toolbar: [
            {
                id: "fixture-toolbar",
                render: () =>
                    options.has("module-sidebar")
                        ? renderModuleFilters([], createModuleFilters(), {
                              i18n,
                              escapeHtml,
                              formatTag: (value) => value,
                          })
                        : options.has("empty-toolbar")
                          ? ""
                          : menus
                            ? menu.render() + renderTemplate("sidebar-controls")
                            : renderTemplate("toolbar-content"),
            },
        ],
        subNavigation: menus
            ? [
                  {
                      id: "fixture-nav",
                      render: () => renderTemplate("subnav-content"),
                  },
              ]
            : [],
        subPageNavigation: nested,
        elements: nested
            ? [
                  {
                      id: "nested",
                      label: i18n.t("ui.reuse.elements"),
                      render: () => "",
                      subComposerOptions: {
                          elements,
                          preferenceKey: "responsive-nested-grid",
                          allowCustomization: true,
                      },
                  },
              ]
            : elements,
    });
    function openFixturePopup() {
        return openPopup({
            title: i18n.t("ui.reuse.settings"),
            body:
                renderTemplate("form-content") + renderTemplate("long-content"),
            actions: ["save", "cancel", "reset", "copy", "add", "remove"].map(
                (id) => ({ id, label: i18n.t(`ui.reuse.${id}`) }),
            ),
        }).then((result) => {
            window.fixture.popupResult = result;
        });
    }
    function openFixtureSearch() {
        return openSearchPopup({
            endpoint: "/api/v1/fixture-search",
            ariaLabel: i18n.t("ui.reuse.search"),
            localGroups: [],
            onSelect: (result) => {
                window.fixture.searchResult = result;
            },
        });
    }
    root.addEventListener("click", (event) => {
        if (event.target.closest("[data-fixture-popup]"))
            void openFixturePopup();
        if (event.target.closest("[data-fixture-search]")) openFixtureSearch();
    });
    await composer.init();
    if (menus) menu.mount(root, { signal: lifetime.signal });
    // This component fixture mounts directly without the application's page-entry loader.
    document.body.dataset.pageReady = "true";
    const topnav = root.querySelector(".topnav");
    for (const key of [
        "administration",
        "settings",
        "modules",
        "profile",
        "calendar",
        "messages",
    ]) {
        const link = document.createElement("a");
        link.href = `/${key}`;
        link.textContent = Array(3)
            .fill(i18n.t(`ui.reuse.${key}`))
            .join(" ");
        topnav.append(link);
    }
    root.querySelector("#profile-name").textContent = Array(12)
        .fill(i18n.t("ui.reuse.display_name"))
        .join(" ");
    bindCompactNavigation(root, { signal: lifetime.signal });
    const owner = uiCtx.capabilities
        .get("ui:tutorials")
        .owner("responsive.fixture", {
            signal: lifetime.signal,
            i18n,
        });
    await owner.target("form", {
        resolve: () => root.querySelector('[data-composer-element="form"]'),
    });
    const guide = await owner.register({
        version: 1,
        id: "layout",
        page: "/",
        automatic: false,
        titleKey: "ui.reuse.settings",
        steps: ["first", "second", "third"].map((id) => ({
            id,
            target: "responsive.fixture:form",
            titleKey: "ui.reuse.settings",
            bodyKey: "ui.app.settings.page_subtitle",
            effects: { callout: true, spotlight: true, arrow: true },
        })),
    });
    window.fixture = {
        menu,
        menuChoices,
        elementCount: elements.length,
        composer,
        lifetime,
        openFixturePopup,
        openFixtureSearch,
        async openGuide() {
            const session = await guide.start();
            await session.ready;
            await session.next();
            return session.state();
        },
        ready: true,
    };
} catch (error) {
    window.fixture = { error: error.stack };
    console.error(error);
}
