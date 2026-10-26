import { createI18n } from "/static/reuse/i18n.js";
import { registerLibraryClient } from "/static/gateways/study/library-client.js";
import { headingCompositionReferences } from "./app/presentation.js";

export async function mountProvider(ctx) {
    ctx.capabilities
        .get("offline:assets")
        .register(
            [
                "/static/adapters/study/library/assets/edit-light.svg",
                "/static/adapters/study/library/assets/edit-dark.svg",
                "/static/adapters/study/library/assets/draw-light.svg",
                "/static/adapters/study/library/assets/draw-dark.svg",
                "/static/adapters/study/library/assets/speaker-light.svg",
                "/static/adapters/study/library/assets/speaker-dark.svg",
                "/static/adapters/study/library/assets/clear-search.svg",
                "/static/assets/reuse/arrow-back-light.svg",
                "/static/assets/reuse/arrow-back-dark.svg",
            ],
            { signal: ctx.signal },
        );
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
