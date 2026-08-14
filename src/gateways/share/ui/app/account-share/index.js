import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { resolveAccountShare } from "../../received-share.js";

function resolveAccountShareId() {
    const match = window.location.pathname.match(/^\/share\/usr_([^/]+)$/);
    return match ? decodeURIComponent(match[1]) : "";
}

function buildStatusElement(i18n, messageKey) {
    return {
        id: "account-share-status",
        label: i18n.t("share.page_title"),
        pinned: true,
        gridSize: {
            default: [12, 10],
            min: [8, 5],
            max: ["fill", "fill"],
        },
        render: () =>
            `<section class="share-window card-elevated"><div class="share-window-body"><p>${escapeHtml(i18n.t(messageKey))}</p></div></section>`,
    };
}

export async function mount(root) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    applyDocumentTitle(i18n, "share.page_title");
    const composer = createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "account-share-page-layout",
        pageContext: {
            title: i18n.t("share.page_title"),
            subtitle: i18n.t("share.subtitle"),
        },
        showNavbar: true,
        requireAccountSession: true,
        persistLayoutPreferences: false,
        elements: [buildStatusElement(i18n, "share.loading")],
    });
    await composer.init();
    const shareId = resolveAccountShareId();
    const result = shareId ? await resolveAccountShare(shareId) : null;
    const destinationUrl = String(result?.data?.destinationUrl ?? "").trim();
    if (destinationUrl) {
        const destination = new URL(destinationUrl, window.location.origin);
        const destinationPath = `${destination.pathname}${destination.search}${destination.hash}`;
        if (await navigateTo(destinationPath)) return;
    }
    composer.refresh([
        buildStatusElement(
            i18n,
            result === null
                ? "share.error.missing_token"
                : "share.error.access_denied",
        ),
    ]);
}

await mountWhenDirect(mount);
