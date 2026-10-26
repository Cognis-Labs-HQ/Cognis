import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showOfflineContentNotice } from "./offline-content.js";

/** A Study page still has a usable shell when its private content or view template is absent. */
export async function mountOfflineStudyPage(root, { i18n, signal, title }) {
    const composer = createPageComposer(root, {
        i18n,
        signal,
        allowCustomization: false,
        preferenceKey: "study-offline-empty-layout",
        pageContext: {
            title,
            subtitle: i18n.t("ui.reuse.offline_mode_active"),
        },
        elements: [
            {
                id: "study-offline-empty",
                label: title,
                pinned: true,
                render: () =>
                    `<section class="study-offline-empty"><p>${escapeHtml(i18n.t("ui.reuse.offline_no_cached_content"))}</p></section>`,
            },
        ],
    });
    await composer.init();
    if (!signal?.aborted) showOfflineContentNotice(i18n, signal);
}
