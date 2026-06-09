import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StudyAdapterBootstrapCtx } from "../../../gateways/study/gateway.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    ctx.registerAdapterStaticDir?.("study", "notepad", ADAPTER_UI_ROOT);

    ctx.log?.("info", "Study/notepad adapter: bootstrapped.", {
        component: "study-notepad",
    });
}
