import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer/index.js";
import { mountWhenDirect } from "../../reuse/page-entry.js";
import { checkIsAuthenticated } from "../../reuse/auth-session.js";
import { escapeHtml } from "../../reuse/escape-html.js";

const KNOWN_ERROR_CODES = new Set([
    "400",
    "401",
    "403",
    "404",
    "405",
    "408",
    "409",
    "410",
    "413",
    "415",
    "422",
    "429",
    "500",
    "502",
    "503",
    "504",
]);

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
    const contentClass = isAuthenticated ? "" : " error-content--fullscreen";
    const ariaLabel = `${escapeHtml(i18n.t("ui.app.error.aria_prefix"))} ${escapeHtml(displayCode)}`;
    const brandMarkup = isAuthenticated
        ? ""
        : `
            <div class="error-brand">
                <img src="/static/assets/icons/cognis-icon.png" alt="" aria-hidden="true" class="error-brand-icon" />
                <span class="error-brand-name">${escapeHtml(i18n.t("ui.shared.brand.name"))}</span>
            </div>
        `;

    return `
        <div class="error-page${fullscreenClass}">
            <div class="error-content${contentClass}">
                ${brandMarkup}
                <div class="error-code" role="img" aria-label="${ariaLabel}">${escapeHtml(displayCode)}</div>
                <p class="error-description">${escapeHtml(description)}</p>
                <a href="/dashboard" class="error-dashboard-btn">
                    ${escapeHtml(i18n.t("ui.reuse.return_to_dashboard"))}
                </a>
            </div>
        </div>
    `;
}

function buildErrorElement(i18n, errorCode, isAuthenticated) {
    return {
        id: "error-view",
        label: errorCode || "error",
        pinned: true,
        gridSize: {
            default: [12, 8],
            min: [12, 6],
            max: ["fill", "fill"],
        },
        render: () => buildErrorContent(i18n, errorCode, isAuthenticated),
    };
}

export async function mount(root, { signal } = {}) {
    const [i18n, isAuthenticated] = await Promise.all([
        createI18n(),
        checkIsAuthenticated(),
    ]);

    applyDocumentTitle(i18n, "ui.page.title.error");

    const errorCode = resolveErrorCode(window.location.search);

    const sharedComposerOptions = {
        allowCustomization: false,
        i18n,
        preferenceKey: "error-layout",
        pageContext: {
            title: i18n.t("ui.reuse.error"),
            subtitle: i18n.t("ui.app.error.page_subtitle"),
        },
        persistLayoutPreferences: false,
    };

    const authComposerOptions = isAuthenticated
        ? {}
        : {
              showTopbar: false,
              showNavbar: false,
              showFooter: false,
              showThemeToggle: true,
              frameless: true,
          };

    const composer = createPageComposer(root, {
        ...sharedComposerOptions,
        ...authComposerOptions,
        elements: [buildErrorElement(i18n, errorCode, isAuthenticated)],
    });

    window.addEventListener(
        "popstate",
        () => {
            const updatedCode = resolveErrorCode(window.location.search);
            composer.refresh([
                buildErrorElement(i18n, updatedCode, isAuthenticated),
            ]);
        },
        { signal },
    );

    await composer.init();
}

await mountWhenDirect(mount);
