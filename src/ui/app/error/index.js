import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/init.js";
import { checkIsAuthenticated } from "../../reuse/auth-session.js";
import { escapeHtml } from "../../reuse/escape-html.js";

const KNOWN_ERROR_CODES = new Set(["400", "401", "403", "404", "500", "503"]);

function resolveErrorCode(search) {
    const rawCode = new URLSearchParams(search).get("code") ?? "";
    return /^\d+$/.test(rawCode) ? rawCode : "";
}

function buildErrorContent(i18n, errorCode, isAuthenticated) {
    const displayCode = errorCode || "???";
    const descriptionKey = KNOWN_ERROR_CODES.has(errorCode)
        ? `ui.app.error.code.${errorCode}`
        : "ui.app.error.code.default";
    const description = i18n.t(descriptionKey);
    const fullscreenClass = isAuthenticated ? "" : " error-page--fullscreen";
    const ariaLabel = `${escapeHtml(i18n.t("ui.app.error.aria_prefix"))} ${escapeHtml(displayCode)}`;

    return `
        <div class="error-page${fullscreenClass}">
            <div class="error-content">
                <div class="error-code" role="img" aria-label="${ariaLabel}">${escapeHtml(displayCode)}</div>
                <p class="error-description">${escapeHtml(description)}</p>
                <a href="/dashboard" class="error-dashboard-btn">
                    ${escapeHtml(i18n.t("ui.app.error.return_to_dashboard"))}
                </a>
            </div>
        </div>
    `;
}

export async function mount(root, { signal } = {}) {
    const [i18n, isAuthenticated] = await Promise.all([
        createI18n(),
        checkIsAuthenticated(),
    ]);

    applyDocumentTitle(i18n, "ui.page.title.error");

    const errorCode = resolveErrorCode(window.location.search);

    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "error-layout",
        pageContext: {
            title: i18n.t("ui.reuse.error"),
            subtitle: i18n.t("ui.app.error.page_subtitle"),
        },
        showTopbar: isAuthenticated,
        showNavbar: isAuthenticated,
        showFooter: isAuthenticated,
        showThemeToggle: true,
        frameless: true,
        persistLayoutPreferences: false,
        elements: [
            {
                id: "error-view",
                label: errorCode || "error",
                pinned: true,
                gridSize: {
                    default: [12, 6],
                    min: [6, 4],
                    max: ["full", "fill"],
                },
                render: () =>
                    buildErrorContent(i18n, errorCode, isAuthenticated),
            },
        ],
    });

    window.addEventListener(
        "popstate",
        () => {
            const updatedCode = resolveErrorCode(window.location.search);
            composer.refresh([
                {
                    id: "error-view",
                    label: updatedCode || "error",
                    pinned: true,
                    gridSize: {
                        default: [12, 6],
                        min: [6, 4],
                        max: ["full", "fill"],
                    },
                    render: () =>
                        buildErrorContent(i18n, updatedCode, isAuthenticated),
                },
            ]);
        },
        { signal },
    );

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
