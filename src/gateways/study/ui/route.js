import { apiFetch } from "/static/reuse/api-client.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import {
    loadWithSpaImportGuard,
    mountWhenDirect,
} from "/static/reuse/page-entry.js";
import { navigateTo } from "/static/reuse/app-router.js";

let childComponentsPromise;

export function invalidateStudyChildComponentCache() {
    childComponentsPromise = undefined;
}

async function fetchJson(path) {
    const response = await apiFetch(path);
    if (!response.ok)
        throw new Error(
            `Unable to load Study route data (${response.status}).`,
        );
    return response.json();
}

async function loadChildComponents() {
    childComponentsPromise ??= (async () => {
        const languagesPayload = await fetchJson(
            "/api/v1/study/registered-languages",
        );
        const languages = Array.isArray(languagesPayload?.data)
            ? languagesPayload.data
            : [];
        const responses = await Promise.all(
            languages.map((language) =>
                fetchJson(
                    `/api/v1/study/languages/${encodeURIComponent(String(language.code ?? ""))}/modules`,
                ).catch(() => ({ data: [] })),
            ),
        );
        return {
            languages,
            components: responses.flatMap((response) =>
                Array.isArray(response?.data) ? response.data : [],
            ),
        };
    })();
    return childComponentsPromise;
}

export async function mount(root, options = {}) {
    if (
        ["/study", "/study/", "/study/welcome", "/study/settings"].includes(
            window.location.pathname,
        )
    ) {
        const hub = await loadWithSpaImportGuard(
            () => import("/static/gateways/study/study.js"),
        );
        await hub.mount(root, options);
        return;
    }
    const { languages, components } = await loadChildComponents();
    if (languages.length === 0) {
        await navigateTo("/error?code=503");
        return;
    }
    const component = components.find(
        (candidate) => candidate?.pageUrl === window.location.pathname,
    );
    if (!component?.scriptUrl)
        throw new Error("Study child route unavailable.");
    await Promise.all(
        (component.stylesheets ?? []).map((stylesheet) =>
            ensurePageStylesheet(stylesheet),
        ),
    );
    const module = await loadWithSpaImportGuard(
        () => import(component.scriptUrl),
    );
    await module.mount(root, options);
}

await mountWhenDirect(mount);
