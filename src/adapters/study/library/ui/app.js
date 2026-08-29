import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import { fetchEntries, fetchLayers } from "./client.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "gateway.study.library_label");
    const language =
        new URLSearchParams(window.location.search).get("language") ??
        undefined;
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: language,
    });
    let layers = [];
    let entries = [];
    try {
        [layers, entries] = await Promise.all([
            fetchLayers(),
            fetchEntries({ scope: "global" }),
        ]);
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
    }
    const populatedLayers = layers.filter((layer) =>
        entries.some((entry) => entry.layer === layer),
    );
    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements: [
            {
                id: "study-library",
                label: i18n.t("gateway.study.library_label"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                <section class="library-browser">
                    <nav class="library-layers" aria-label="${escapeHtml(i18n.t("gateway.study.library_layers"))}">
                        ${populatedLayers.map((layer) => `<a href="#layer-${escapeHtml(layer)}">${escapeHtml(layer.replaceAll("_", " "))}</a>`).join("")}
                    </nav>
                    ${
                        populatedLayers.length === 0
                            ? `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`
                            : populatedLayers
                                  .map(
                                      (layer) => `
                        <section id="layer-${escapeHtml(layer)}">
                            <h2>${escapeHtml(layer.replaceAll("_", " "))}</h2>
                            <ul>${entries
                                .filter((entry) => entry.layer === layer)
                                .map(
                                    (entry) =>
                                        `<li><strong>${escapeHtml(entry.label)}</strong></li>`,
                                )
                                .join("")}</ul>
                        </section>`,
                                  )
                                  .join("")
                    }
                </section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
        subNavigation: renderStudySubNavigation({
            model,
            currentPath: window.location.pathname,
            i18n,
        }),
    });
    await composer.init();
    signal?.throwIfAborted();
}

await mount(document.querySelector("#app"));
