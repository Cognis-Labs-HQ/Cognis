import { uiCtx } from "/static/reuse/ui-ctx.js";
import { apiFetch } from "/static/reuse/api-client.js";

async function fetchList(path) {
    const response = await apiFetch(path);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

const subPages = uiCtx.capabilities.get("ui:subPages");
subPages?.register("study", {
    listGroups: () => fetchList("/api/v1/study/registered-languages"),
    listPages: (languageCode) =>
        fetchList(
            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
        ),
});

uiCtx.capabilities.contribute("study:subPages", subPages);

const DETAIL_FLOW = "study:library:composeEntryDetail";
if (!uiCtx.flowExists(DETAIL_FLOW)) {
    uiCtx.registerFlow(DETAIL_FLOW, [
        "beforeCore",
        "core",
        "afterCore",
        "actions",
    ]);
}

uiCtx.capabilities.contribute("study:library:detailFlow", DETAIL_FLOW);
