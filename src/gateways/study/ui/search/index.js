import { apiFetch } from "/static/reuse/api-client.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";

export const componentSearchId = "study";

let studyIndexPromise = null;

async function fetchJson(path) {
    const response = await apiFetch(path);
    if (!response.ok) return null;
    return response.json().catch(() => null);
}

async function buildLanguageItems(language) {
    const languageCode = String(language?.code ?? "").trim();
    if (!languageCode) return [];
    const languageName = String(language?.name || languageCode);
    const modulesPayload = await fetchJson(
        `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
    );
    const modules = Array.isArray(modulesPayload?.data)
        ? modulesPayload.data
        : [];
    const firstModuleUrl = modules
        .map((component) => String(component?.pageUrl ?? ""))
        .find(Boolean);
    const items = [
        {
            id: `study-language:${languageCode}`,
            label: ["Study", languageName].join(" / "),
            description: "Study",
            url: firstModuleUrl || "/study",
            resultClass: "page",
            searchText: ["Study", languageName, languageCode].join(" "),
            visible: true,
        },
    ];
    for (const component of modules) {
        const pageUrl = String(component?.pageUrl ?? "").trim();
        const label = String(
            component?.label ?? component?.id ?? pageUrl,
        ).trim();
        if (!pageUrl || !label) continue;
        items.push({
            id: `study-module:${languageCode}:${component?.id ?? label}`,
            label: ["Study", languageName, label].join(" / "),
            description: ["Study", languageName].join(" / "),
            url: pageUrl,
            resultClass: "page",
            searchText: ["Study", languageName, label, component?.id]
                .filter(Boolean)
                .join(" "),
            visible: true,
        });
    }
    return items;
}

export async function buildSearchResults() {
    const languagesPayload = await fetchJson(
        "/api/v1/study/registered-languages",
    );
    const registeredLanguages = Array.isArray(languagesPayload?.data)
        ? languagesPayload.data
        : [];
    const languageItems = (
        await Promise.all(registeredLanguages.map(buildLanguageItems))
    ).flat();
    const items = [
        {
            id: "study-page",
            label: "Study",
            description: "Pages",
            url: "/study",
            resultClass: "page",
            searchText: "Study",
            visible: true,
        },
        ...languageItems,
        {
            id: "study-settings",
            label: "Study / Language Settings",
            description: "Study",
            url: "/study/settings",
            resultClass: "setting",
            searchText: "Study Language Settings",
            visible: true,
        },
    ];
    return [{ category: "Pages", items }];
}

export function collectStudyGatewaySearchGroups() {
    studyIndexPromise ??= buildSearchResults().finally(() => {
        studyIndexPromise = null;
    });
    return studyIndexPromise;
}

export function registerSearchIndexing() {
    return registerSearchIndex("study", collectStudyGatewaySearchGroups, {
        componentId: componentSearchId,
    });
}
