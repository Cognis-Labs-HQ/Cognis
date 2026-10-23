import { observeDrawingCard } from "/static/gateways/study/reuse/drawing-state.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    openDrawingPad,
    loadDrawingPad,
} from "/static/gateways/study/reuse/drawing.js";

uiCtx.capabilities.contribute("study:drawing:open", openDrawingPad);
uiCtx.capabilities.contribute("study:drawing:load", loadDrawingPad);

uiCtx.capabilities.contribute("study:drawing:observe", observeDrawingCard);
