import { registerDrawingDelivery } from "./drawing-client.js";
import { registerFavouriteDelivery } from "./reuse/favourites.js";
import { apiFetch } from "/static/reuse/api-client.js";

async function fetchList(path) {
    const response = await apiFetch(path);
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

export function mountProvider(uiCtx) {
    const subPages = uiCtx.capabilities.get("ui:subPages");
    subPages?.register("study", {
        listGroups: () => fetchList("/api/v1/study/registered-languages"),
        listPages: (languageCode) =>
            fetchList(
                `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
            ),
    });
    uiCtx.signal.addEventListener(
        "abort",
        () => subPages?.unregister("study"),
        { once: true },
    );

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

    const releases = [
        registerDrawingDelivery(uiCtx),
        registerFavouriteDelivery(uiCtx),
    ];
    return () => {
        for (const release of releases) release();
    };
}
