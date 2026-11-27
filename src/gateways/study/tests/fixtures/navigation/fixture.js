import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    createStudySubNavigationSlot as createStudyNestedNavigationSlot,
    bindStudySubNavigation as bindStudyNestedNavigation,
} from "/static/gateways/study/sub-navigation.js";

const finish = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const options = new URL(location.href).searchParams;
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/study/languages"],
    preferredLanguages: [options.get("locale") || "en"],
});
const root = document.querySelector("#app");
const lifetime = new AbortController();
const selected = options.get("language") || "ja";
const languages = options.has("multiple")
    ? data.languages
    : data.languages.filter((language) => language.code === selected);
const model = {
    selectedLanguageCode: selected,
    learningLanguages: languages.map((language) => language.code),
    enrolledLanguages: languages.map((language) => language.code),
    modules: data.modules,
    languageCatalogByCode: new Map(
        languages.map((language) => [language.code, language]),
    ),
    languagePageUrlsByCode: new Map(
        languages.map((language) => [language.code, "/study/explore"]),
    ),
    dictionaryProviders: data.dictionaryProviders,
};
const navigations = [];
const previousNavigate = uiCtx.capabilities.get("ui:navigate");
if (previousNavigate)
    uiCtx.capabilities.remove("ui:navigate", previousNavigate);
const navigate = (url, options) => navigations.push({ url, options });
uiCtx.capabilities.contribute("ui:navigate", navigate);
lifetime.signal.addEventListener(
    "abort",
    () => {
        uiCtx.capabilities.remove("ui:navigate", navigate);
        if (previousNavigate)
            uiCtx.capabilities.contribute("ui:navigate", previousNavigate);
    },
    { once: true },
);
const composer = createPageComposer(root, {
    i18n,
    signal: lifetime.signal,
    allowCustomization: false,
    requireAccountSession: false,
    enableAccountEnhancements: false,
    subNavigation: [createStudyNestedNavigationSlot(model, i18n)],
    pageContext: {
        title: i18n.t("ui.reuse.study"),
        subtitle: i18n.t("gateway.study.page_subtitle"),
    },
    elements: [
        {
            id: "content",
            gridSize: { default: [8, 3], min: [1, 1], max: "full" },
            render: () => "",
        },
    ],
    onRender: () =>
        bindStudyNestedNavigation(root, { signal: lifetime.signal, i18n }),
});
await composer.init();
finish();
window.fixture = { composer, lifetime, navigations, i18n };
