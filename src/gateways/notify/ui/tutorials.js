import { guides } from "./guides.js";

export async function mountProvider(ctx) {
    const { mountTutorialProvider } = await ctx.capabilities
        .get("ui:reuse")
        .importModule("tutorials/pages.js");
    return mountTutorialProvider(ctx, {
        guides,
        stringsBaseUrls: ["/static/gateways/notify/languages"],
        capability: "notify:pageTutorials",
    });
}
