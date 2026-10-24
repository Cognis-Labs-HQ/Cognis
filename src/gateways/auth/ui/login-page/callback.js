import { createI18n } from "/static/reuse/i18n.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderInPageCallout } from "/static/reuse/in-page-callout.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { resolveCallbackContinuation } from "./callback-continuation.js";

export async function mount(root) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/auth/languages"],
    });
    const continuation = resolveCallbackContinuation(window.location);
    if (continuation) {
        window.location.replace(continuation);
        return;
    }
    window.history.replaceState({}, "", window.location.pathname);
    createPageComposer(root, {
        allowCustomization: false,
        i18n,
        preferenceKey: "sso-callback-layout",
        pageContext: {
            title: i18n.t("ui.app.login.title"),
            subtitle: i18n.t("ui.app.login.page_subtitle"),
        },
        showTopbar: false,
        showNavbar: false,
        showFooter: false,
        frameless: true,
        persistLayoutPreferences: false,
        toolbar: [],
        elements: [
            {
                id: "sso-callback-error",
                label: i18n.t("ui.app.login.sso_callback_failed"),
                pinned: true,
                gridSize: { default: [12, 4], min: [8, 3], max: "full" },
                render: () =>
                    renderInPageCallout({
                        variant: "danger",
                        title: i18n.t("ui.app.login.sso_callback_failed"),
                        bodyHtml: `<a class="btn-neutral btn-animated" href="/login">${escapeHtml(i18n.t("ui.reuse.go_back"))}</a>`,
                    }),
            },
        ],
    });
}

await mount(document.querySelector("#app"));
