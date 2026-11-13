import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n, applyStaticTranslations } from "/static/reuse/i18n.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-util/popup.js";
import { bindCompactNavigation } from "/static/layouts/compact-navigation.js";

try {
    const scenarios = await (await fetch("/scenarios.json")).json();
    const options = new URLSearchParams(location.search);
    const scenario = scenarios[options.get("scenario") ?? "default"];
    const i18n = await createI18n({ preferredLanguages: ["en"] });
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
    const composer = createPageComposer(root, {
        i18n,
        preferenceKey: nested ? "responsive-nested" : "responsive-grid",
        allowCustomization: true,
        requireAccountSession: false,
        enableAccountEnhancements: false,
        toolbarScrollable: true,
        signal: lifetime.signal,
        pageContext: {
            title: i18n.t("ui.reuse.settings"),
            subtitle: i18n.t("ui.reuse.more_information"),
        },
        toolbar: [
            {
                id: "fixture-toolbar",
                render: () => renderTemplate("toolbar-content"),
            },
        ],
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
    window.fixture = {
        composer,
        lifetime,
        openFixturePopup,
        openFixtureSearch,
        ready: true,
    };
} catch (error) {
    window.fixture = { error: error.stack };
    console.error(error);
}
