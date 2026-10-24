import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "drawing",
        adapterName: "Drawing Practice",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => true,
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    ctx.registerAdapterStaticDir?.("study", "drawing", `${ctx.adapterRoot}/ui`);
    ctx.registerNavbarPlugin("/static/adapters/study/drawing/provider.js", () =>
        ctx.isAdapterEnabled(),
    );
    await ctx.log?.("info", "Study drawing adapter registered.", {
        component: "study-drawing",
        operation: "bootstrap",
    });
}
