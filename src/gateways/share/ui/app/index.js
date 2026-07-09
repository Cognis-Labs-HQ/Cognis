import { apiFetch } from "/static/reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { getShareRenderer } from "./renderer-registry.js";

const ACCESS_TOKEN_KEY = "cognis_access_token";
const PREVIOUS_ACCESS_TOKEN_KEY = "cognis_prev_access_token";
const GUEST_TOKEN_ACTIVE_KEY = "cognis_share_guest_token_active";

function resolveTokenFromLocation() {
    const pathnameMatch = window.location.pathname.match(/^\/share\/([^/]+)$/);
    if (pathnameMatch) {
        return decodeURIComponent(pathnameMatch[1]);
    }
    return String(
        new URL(window.location.href).searchParams.get("token") ?? "",
    ).trim();
}

function renderHeader(i18n) {
    return `
        <header class="share-window-header">
            <div class="share-branding">
                <span class="share-branding-logo" aria-hidden="true">◈</span>
                <div>
                    <p class="share-branding-name">${escapeHtml(i18n.t("ui.reuse.brand_name"))}</p>
                    <p class="share-branding-subtitle">${escapeHtml(i18n.t("share.subtitle"))}</p>
                </div>
            </div>
            <div class="share-header-actions">
                <a class="btn-cancel btn-animated" href="/login">${escapeHtml(i18n.t("ui.reuse.login"))}</a>
                <a class="btn-confirm btn-animated" href="/register">${escapeHtml(i18n.t("ui.reuse.register"))}</a>
            </div>
        </header>
    `;
}

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

function buildShareElement(state) {
    return {
        id: "share-page",
        label: state.i18n.t("share.page_title"),
        pinned: true,
        gridSize: {
            default: [12, 6],
            min: [8, 5],
            max: ["full", "fill"],
        },
        render: () => {
            if (state.loading) {
                return `
                    <div class="share-window card-elevated">
                        ${renderHeader(state.i18n)}
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
                        ${renderHeader(state.i18n)}
                        ${renderFallbackBody(state.i18n, state.errorKey)}
                    </div>
                `;
            }
            return `
                <div class="share-window card-elevated">
                    ${renderHeader(state.i18n)}
                    <section class="share-window-body">${state.renderedContent}</section>
                </div>
            `;
        },
    };
}

function activateGuestTokenSession(guestAccessToken) {
    const normalizedToken = String(guestAccessToken ?? "").trim();
    if (!normalizedToken) {
        return () => undefined;
    }
    const previousAccessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (previousAccessToken) {
        sessionStorage.setItem(PREVIOUS_ACCESS_TOKEN_KEY, previousAccessToken);
    } else {
        sessionStorage.removeItem(PREVIOUS_ACCESS_TOKEN_KEY);
    }
    sessionStorage.setItem(GUEST_TOKEN_ACTIVE_KEY, "1");
    localStorage.setItem(ACCESS_TOKEN_KEY, normalizedToken);
    return () => {
        const active = sessionStorage.getItem(GUEST_TOKEN_ACTIVE_KEY) === "1";
        if (!active) return;
        const restoredToken = sessionStorage.getItem(PREVIOUS_ACCESS_TOKEN_KEY);
        if (restoredToken) {
            localStorage.setItem(ACCESS_TOKEN_KEY, restoredToken);
        } else {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
        }
        sessionStorage.removeItem(PREVIOUS_ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(GUEST_TOKEN_ACTIVE_KEY);
    };
}

export async function mount(root, { signal } = {}) {
    const state = {
        loading: true,
        errorKey: "",
        renderedContent: "",
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
        showTopbar: false,
        showNavbar: false,
        showFooter: false,
        showThemeToggle: true,
        frameless: true,
        persistLayoutPreferences: false,
        elements: [buildShareElement(state)],
    });

    await composer.init();
    const token = resolveTokenFromLocation();
    if (!token) {
        state.loading = false;
        state.errorKey = "share.error.missing_token";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    const response = await apiFetch(
        `/api/v1/share/resolve/${encodeURIComponent(token)}`,
    );
    if (!response.ok) {
        state.loading = false;
        state.errorKey =
            response.status === 404
                ? "share.error.not_found"
                : "share.error.expired";
        composer.refresh([buildShareElement(state)]);
        return;
    }
    const body = await response.json().catch(() => ({ data: null }));
    const shareData = body?.data ?? null;
    if (!shareData?.resourceType) {
        state.loading = false;
        state.errorKey = "share.error.malformed_response";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    if (shareData.page?.stringsBaseUrl) {
        state.i18n = await extendI18n(
            state.i18n,
            shareData.page.stringsBaseUrl,
        );
    }
    const deactivateGuestSession = activateGuestTokenSession(
        shareData.guestAccessToken,
    );
    window.addEventListener("beforeunload", deactivateGuestSession, { signal });
    signal?.addEventListener("abort", deactivateGuestSession, { once: true });

    if (shareData.page?.mountScriptUrl) {
        const mountModule = await import(String(shareData.page.mountScriptUrl));
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
        state.renderedContent = '<div id="share-resource-mount-root"></div>';
        composer.refresh([buildShareElement(state)]);
        const mountRoot = root.querySelector("#share-resource-mount-root");
        if (!(mountRoot instanceof HTMLElement)) {
            state.errorKey = "share.error.renderer_missing";
            composer.refresh([buildShareElement(state)]);
            return;
        }
        await mountSharedPage(mountRoot, {
            shareData,
            i18n: state.i18n,
            signal,
        });
        return;
    }

    if (shareData.page?.rendererScriptUrl) {
        await import(String(shareData.page.rendererScriptUrl));
    }
    const renderer = getShareRenderer(shareData.resourceType);
    if (!renderer) {
        state.loading = false;
        state.errorKey = "share.error.renderer_missing";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    const renderedContent = renderer({
        data: shareData.payload ?? {},
        grantedCapabilities: Array.isArray(shareData.grantedCapabilities)
            ? shareData.grantedCapabilities
            : [],
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
