import { registerDrawingDelivery } from "./drawing-client.js";
import { registerFavouriteClient } from "./reuse/favourites-client.js";
import {
    registerStudyNavigation,
    fetchStudyLanguages,
    fetchStudyModules,
} from "./navigation-client.js";

export function mountProvider(uiCtx) {
    registerStudyNavigation(uiCtx);
    const nestedPages = uiCtx.capabilities.get("ui:subPages");
    nestedPages?.register("study", {
        listGroups: () => fetchStudyLanguages(),
        listPages: (languageCode) => fetchStudyModules(languageCode),
    });
    uiCtx.signal.addEventListener(
        "abort",
        () => nestedPages?.unregister("study"),
        { once: true },
    );

    uiCtx.capabilities.contribute("study:subPages", nestedPages);

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
        registerFavouriteClient(uiCtx),
    ];
    return () => {
        for (const release of releases) release();
    };
}
