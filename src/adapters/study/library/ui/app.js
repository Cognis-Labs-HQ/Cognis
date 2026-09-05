import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";
import {
    fetchLibraryEntries,
    fetchLibraryEntry,
    fetchLibrarySchemas,
} from "/static/gateways/study/ui/library-client.js";
import {
    buildLibraryUrl,
    parseLanguageCode,
    withLanguageQuery,
} from "/static/gateways/study/ui/language.js";

function entryUrl(entry, languageCode) {
    return withLanguageQuery(
        `/study/library/${encodeURIComponent(entry.schemaId)}/${encodeURIComponent(entry.layer)}/${encodeURIComponent(entry.id)}`,
        languageCode,
    );
}

function localizedLabel(metadata, contentLanguage) {
    const labels = metadata?.labels ?? {};
    const preferredLanguages = [
        document.documentElement.lang,
        ...navigator.languages,
        contentLanguage,
        "en",
    ].filter(Boolean);
    for (const language of preferredLanguages) {
        const exact = labels[language];
        if (exact) return exact;
        const base = labels[language.split("-")[0]];
        if (base) return base;
    }
    return Object.values(labels)[0] ?? "";
}

function renderRelationshipList(entries, emptyLabel, languageCode) {
    if (entries.length === 0) return `<p>${escapeHtml(emptyLabel)}</p>`;
    return `<ul>${entries
        .map(
            (entry) =>
                `<li><a href="${entryUrl(entry, languageCode)}">${escapeHtml(entry.label)}</a></li>`,
        )
        .join("")}</ul>`;
}

function renderDetail(detail, i18n, languageCode) {
    const { entry, references, usedBy } = detail;
    const fields = Object.entries(entry.fields ?? {});
    return `<article class="library-detail">
        <p><a href="${escapeHtml(buildLibraryUrl(languageCode))}">${escapeHtml(i18n.t("gateway.study.library_back"))}</a></p>
        <h2>${escapeHtml(entry.label)}</h2>
        <dl>
            <dt>${escapeHtml(i18n.t("gateway.study.library_schema"))}</dt><dd>${escapeHtml(entry.schemaId)}</dd>
            <dt>${escapeHtml(i18n.t("gateway.study.library_layer"))}</dt><dd>${escapeHtml(entry.layer)}</dd>
            ${fields.map(([key, value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(value))}</dd>`).join("")}
        </dl>
        <h3>${escapeHtml(i18n.t("gateway.study.library_components"))}</h3>
        ${renderRelationshipList(references, i18n.t("gateway.study.library_no_relationships"), languageCode)}
        <h3>${escapeHtml(i18n.t("gateway.study.library_used_by"))}</h3>
        ${renderRelationshipList(usedBy, i18n.t("gateway.study.library_no_relationships"), languageCode)}
    </article>`;
}

function renderBrowser(schemas, entries, i18n, languageCode) {
    if (schemas.length === 0) {
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    }
    return schemas
        .map(
            (schema) => `<section class="library-schema">
                <h2>${escapeHtml(localizedLabel(schema.metadata, schema.language))}</h2>
                ${schema.layers
                    .map((layer) => {
                        const matching = entries.filter(
                            (entry) =>
                                entry.schemaId === schema.id &&
                                entry.layer === layer.id,
                        );
                        return `<section><h3>${escapeHtml(localizedLabel(layer.metadata, schema.language))}</h3>${renderRelationshipList(matching, i18n.t("gateway.study.library_empty"), languageCode)}</section>`;
                    })
                    .join("")}
            </section>`,
        )
        .join("");
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "gateway.study.library_label");
    const rawLanguageCode = new URLSearchParams(window.location.search).get(
        "language",
    );
    const languageCode = parseLanguageCode(rawLanguageCode);
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: languageCode,
    });
    const segments = window.location.pathname.split("/").filter(Boolean);
    const entryId = segments.length === 5 ? segments[4] : undefined;
    let content;
    try {
        if (rawLanguageCode !== null && !languageCode) {
            throw new Error("invalid_language");
        }
        const schemas = await fetchLibrarySchemas(languageCode);
        if (entryId) {
            const detail = await fetchLibraryEntry(entryId);
            const schemaIds = new Set(schemas.map((schema) => schema.id));
            if (!schemaIds.has(detail.entry.schemaId)) {
                throw new Error("entry_language_mismatch");
            }
            content = renderDetail(detail, i18n, languageCode);
        } else {
            const entryGroups = await Promise.all(
                schemas.map((schema) =>
                    fetchLibraryEntries({
                        scope: "global",
                        schemaId: schema.id,
                    }),
                ),
            );
            content = renderBrowser(
                schemas,
                entryGroups.flat(),
                i18n,
                languageCode,
            );
        }
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
        content = `<p>${escapeHtml(i18n.t("gateway.study.library_load_error"))}</p>`;
    }
    const composer = createPageComposer(root, {
        allowCustomization: true,
        elements: [
            {
                id: "study-library",
                label: i18n.t("gateway.study.library_label"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser">${content}</section>`,
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
