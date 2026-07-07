import { apiFetch } from "/static/reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    extendI18n,
} from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createI18n as createRendererI18n } from "/static/reuse/i18n.js";
import { getShareRenderer } from "./renderer-registry.js";

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
                    <p class="share-branding-name">${escapeHtml(i18n.t("ui.shared.brand.name"))}</p>
                    <p class="share-branding-subtitle">${escapeHtml(i18n.t("share.subtitle"))}</p>
                </div>
            </div>
            <div class="share-header-actions">
                <a class="btn-cancel btn-animated" href="/login">${escapeHtml(i18n.t("ui.app.login.title"))}</a>
                <a class="btn-confirm btn-animated" href="/register">${escapeHtml(i18n.t("ui.app.register.submit"))}</a>
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
                                <span class="jitsi-spinner" aria-hidden="true"></span>
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
        state.errorKey = "share.error.invalid_token";
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
                ? "share.error.invalid_token"
                : "share.error.expired";
        composer.refresh([buildShareElement(state)]);
        return;
    }
    const body = await response.json().catch(() => ({ data: null }));
    const shareData = body?.data ?? null;
    if (!shareData?.resourceType) {
        state.loading = false;
        state.errorKey = "share.error.invalid_token";
        composer.refresh([buildShareElement(state)]);
        return;
    }

    if (shareData.page?.stringsBaseUrl) {
        state.i18n = await extendI18n(
            state.i18n,
            shareData.page.stringsBaseUrl,
        );
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
