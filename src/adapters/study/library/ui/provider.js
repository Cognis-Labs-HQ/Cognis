import { createI18n } from "/static/reuse/i18n.js";
import { registerLibraryClient } from "/static/gateways/study/library-client.js";
import { headingCompositionReferences } from "./app/presentation.js";

export async function mountProvider(ctx) {
    registerLibraryClient(ctx);
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["study-library-page", "study-library-layer-page"],
        ctx.signal,
    );
    await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/library/languages",
        ],
    });
    ctx.signal.throwIfAborted();
    ctx.capabilities.contribute("study:library:presentation", {
        titleComposition: headingCompositionReferences,
    });
}
