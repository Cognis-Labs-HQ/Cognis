import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import {
    loadWithSpaImportGuard,
    mountWhenDirect,
} from "/static/reuse/page-entry.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

export function invalidateStudyChildComponentCache() {
    uiCtx.capabilities.get("ui:subPages")?.invalidate("study");
}

async function mountStudyRoute(root, options = {}) {
    if (
        ["/study", "/study/", "/study/welcome", "/study/settings"].includes(
            window.location.pathname,
        )
    ) {
        const hub = await loadWithSpaImportGuard(
            () => import("/static/gateways/study/study.js"),
        );
        await hub.mount(root, options);
        return;
    }
    const subPages = uiCtx.capabilities.get("study:subPages");
    const model = await subPages.load("study");
    if (model.groups.length === 0) {
        await navigateTo("/error?code=503");
        return;
    }
    const component = (
        await subPages.resolve("study", window.location.pathname)
    )?.page;
    if (!component?.scriptUrl)
        throw new Error("Study child route unavailable.");
    await Promise.all(
        (component.stylesheets ?? []).map((stylesheet) =>
            ensurePageStylesheet(stylesheet),
        ),
    );
    const module = await loadWithSpaImportGuard(
        () => import(component.scriptUrl),
    );
    await module.mount(root, options);
}

export { mountStudyRoute as mount };

await mountWhenDirect(mountStudyRoute);
