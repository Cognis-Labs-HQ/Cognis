import path from "node:path";
import { fileURLToPath } from "node:url";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);
const NOTEPAD_SCRIPT_URL =
    "/static/adapters/study/notepad/classroom-notepad.js";
const NOTEPAD_STRINGS_BASE_URL = "/static/adapters/study/notepad/languages";
const NOTEPAD_STYLESHEET_URL =
    "/static/adapters/study/notepad/classes-notepad.css";

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "notepad",
        adapterName: "Notepad",
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    ctx.capabilities.contribute("study:notepad:ui", {
        scriptUrl: NOTEPAD_SCRIPT_URL,
        stringsBaseUrl: NOTEPAD_STRINGS_BASE_URL,
        stylesheetUrl: NOTEPAD_STYLESHEET_URL,
    });
    ctx.registerAdapterStaticDir?.("study", "notepad", ADAPTER_UI_ROOT);

    ctx.log?.("info", "Study/notepad adapter: bootstrapped.", {
        component: "study-notepad",
    });
}
