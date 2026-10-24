import { registerLibraryClient } from "/static/gateways/study/library-client.js";
import { headingCompositionReferences } from "./app/presentation.js";

export function mountProvider(ctx) {
    registerLibraryClient(ctx);
    ctx.capabilities.contribute("study:library:presentation", {
        titleComposition: headingCompositionReferences,
    });
}
