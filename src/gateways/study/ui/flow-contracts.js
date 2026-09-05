import { uiCtx } from "/static/reuse/ui-ctx.js";

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
