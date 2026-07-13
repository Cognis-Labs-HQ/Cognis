import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { ensurePageStylesheet } from "/static/reuse/page-styles.js";
import { installGuestNavigationGuard } from "/static/reuse/guest-blocked-popup.js";
import { getShareRenderer } from "./renderer-registry.js";

function renderFallbackBody(i18n, messageKey) {
    return `
        <section class="share-window-body">
            <div class="share-empty-state">
                <h2>${escapeHtml(i18n.t("share.page_title"))}</h2>
                <p>${escapeHtml(i18n.t(messageKey))}</p>
            </div>
        </section>
    `;
}

/**
 * Builds the composer element for the share page.
 *
 * Grid sizing differs by state: a mounted full-page app (e.g. the real
 * Jitsi Meet meetings page) must occupy the entire content grid so it
 * renders with all of its own boilerplate layout classes intact, which
 * requires the scalar `max: "full"` token (an array like `["full","full"]`
 * is not recognized by the composer and silently falls back to the small
 * default card size). The loading/expired/deleted fallback state is just a
 * small message card, so it keeps a fixed numeric max instead.
 */
function buildShareElement(state) {
    return {
        id: "share-page",
        label: state.i18n.t("share.page_title"),
        pinned: true,
        gridSize: state.isMountedApp
            ? {
                  default: [12, 10],
                  min: [8, 6],
                  max: "full",
              }
            : {
                  default: [12, 6],
                  min: [8, 5],
                  max: [12, 10],
              },
        render: () => {
            if (state.isMountedApp && !state.errorKey) {
                // A mounted app (e.g. the real Jitsi Meet meetings page)
                // owns its own full-page composer, so it is mounted
                // directly with no extra wrapping card around it — this
                // lets it render exactly like the real page instead of
                // being squeezed into a nested share-window box.
                return '<div id="share-resource-mount-root" class="share-app-mount"></div>';
            }
            if (state.loading) {
                return `
                    <div class="share-window card-elevated">
                        <section class="share-window-body">
                            <div class="share-loading-state">
                                <span class="share-spinner" aria-hidden="true"></span>
                                <p>${escapeHtml(state.i18n.t("share.loading"))}</p>
                            </div>
                        </section>
                    </div>
                `;
            }
            if (state.errorKey) {
                return `
                    <div class="share-window card-elevated">
                        ${renderFallbackBody(state.i18n, state.errorKey)}
                    </div>
                `;
            }
            return `
                <div class="share-window card-elevated">
                    <section class="share-window-body">${state.renderedContent}</section>
                </div>
            `;
        },
    };
}

export async function mount(root, { signal } = {}) {
    const state = {
        loading: true,
        errorKey: "",
        renderedContent: "",
        isMountedApp: false,
        i18n: await createI18n({
            componentStringBaseUrls: ["/static/gateways/share/languages"],
        }),
    };
    applyDocumentTitle(state.i18n, "share.page_title");

    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n: state.i18n,
        preferenceKey: "share-page-layout",
        pageContext: {
            title: state.i18n.t("share.page_title"),
            subtitle: state.i18n.t("share.subtitle"),
        },
        showTopbar: true,
        showNavbar: false,
        showFooter: true,
        showThemeToggle: true,
        frameless: true,
        persistLayoutPreferences: false,
        // This page is visited by anonymous guests and runs its own
        // authenticate-session flow below, so it must not block on a full
        // account session — an expired/invalid share token legitimately
        // resolves to an unauthenticated session with no redirect pending,
        // which this page renders its own fallback screen for instead.
        requireAccountSession: false,
        elements: [buildShareElement(state)],
    });

    await composer.init();

    installGuestNavigationGuard({ root, signal });

    const flowResult = await uiCtx.runFlow("authenticate-session", {});
    const session =
        (flowResult?.stageResults?.["resolve-session"] ?? [])[0] ?? null;
    const shareContext = session?.shareContext ?? null;

    if (session?.shareAttempted && !session?.authenticated) {
        // A share token was present in the URL but failed to resolve
        // (expired, revoked, or invalid). Render the fallback screen
        // directly instead of the generic missing/malformed messages below.
        state.loading = false;
        state.errorKey = "share.error.expired";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    if (!shareContext?.resourceType) {
        state.loading = false;
        state.errorKey =
            shareContext === null
                ? "share.error.missing_token"
                : "share.error.malformed_response";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    if (!session?.authenticated) {
        state.loading = false;
        state.errorKey = "share.error.expired";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    if (shareContext.page?.stringsBaseUrl) {
        state.i18n = await extendI18n(
            state.i18n,
            shareContext.page.stringsBaseUrl,
        );
    }

    const stylesheetUrls = Array.isArray(shareContext.page?.stylesheetUrls)
        ? shareContext.page.stylesheetUrls
        : [];
    if (stylesheetUrls.length) {
        await Promise.all(
            stylesheetUrls.map((url) => ensurePageStylesheet(String(url))),
        );
    }

    if (shareContext.page?.mountScriptUrl) {
        globalThis.__spaRouterCount = (globalThis.__spaRouterCount ?? 0) + 1;
        globalThis.__spaRouter = true;
        let mountModule;
        try {
            mountModule = await import(
                String(shareContext.page.mountScriptUrl)
            );
        } finally {
            globalThis.__spaRouterCount--;
            if (globalThis.__spaRouterCount === 0) {
                globalThis.__spaRouter = false;
            }
        }
        const mountSharedPage =
            typeof mountModule?.mount === "function" ? mountModule.mount : null;
        if (!mountSharedPage) {
            state.loading = false;
            state.errorKey = "share.error.renderer_missing";
            composer.refresh([buildShareElement(state)]);
            return;
        }
        state.loading = false;
        state.errorKey = "";
        root.replaceChildren();
        await mountSharedPage(root, {
            shareContext,
            i18n: state.i18n,
            signal,
        });
        return;
    }

    if (shareContext.page?.rendererScriptUrl) {
        globalThis.__spaRouterCount = (globalThis.__spaRouterCount ?? 0) + 1;
        globalThis.__spaRouter = true;
        try {
            await import(String(shareContext.page.rendererScriptUrl));
        } finally {
            globalThis.__spaRouterCount--;
            if (globalThis.__spaRouterCount === 0) {
                globalThis.__spaRouter = false;
            }
        }
    }
    const renderer = getShareRenderer(shareContext.resourceType);
    if (!renderer) {
        state.loading = false;
        state.errorKey = "share.error.renderer_missing";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    const renderedContent = renderer({
        data: shareContext.payload ?? {},
        grantedCapabilities: shareContext.grantedCapabilities,
        i18n: state.i18n,
        signal,
    });
    state.loading = false;
    state.errorKey = "";
    state.renderedContent =
        typeof renderedContent === "string" ? renderedContent : "";
    composer.refresh([buildShareElement(state)]);
}

await mountWhenDirect(mount);
