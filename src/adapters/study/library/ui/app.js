import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
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

const DETAIL_FLOW = "study:library:composeEntryDetail";

export function entryUrl(entry, languageCode) {
    return withLanguageQuery(
        `/study/library/${encodeURIComponent(entry.schemaId)}/${encodeURIComponent(entry.layer)}/${encodeURIComponent(entry.id)}`,
        languageCode,
    );
}

function entryAttributes(entry) {
    return `data-library-schema="${escapeHtml(entry.schemaId)}" data-library-layer="${escapeHtml(entry.layer)}" data-library-entry="${escapeHtml(entry.id)}"`;
}

function localizedLabel(metadata, contentLanguage) {
    const labels = new Map(
        Object.entries(metadata?.labels ?? {}).map(([key, value]) => [
            parseLanguageCode(key),
            value,
        ]),
    );
    for (const language of [
        document.documentElement.lang,
        ...navigator.languages,
        contentLanguage,
        "en",
    ]) {
        const code = parseLanguageCode(language);
        const label = labels.get(code) ?? labels.get(code?.split("-")[0]);
        if (label) return label;
    }
    return Object.values(metadata?.labels ?? {})[0] ?? "";
}

function renderValue(value) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value))
        return `<ul>${value.map((item) => `<li>${renderValue(item)}</li>`).join("")}</ul>`;
    if (typeof value === "object")
        return `<dl>${Object.entries(value)
            .map(
                ([key, item]) =>
                    `<dt>${escapeHtml(key)}</dt><dd>${renderValue(item)}</dd>`,
            )
            .join("")}</dl>`;
    return escapeHtml(String(value));
}

function section(title, value) {
    if (
        value === undefined ||
        value === null ||
        (Array.isArray(value) && value.length === 0)
    )
        return "";
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${renderValue(value)}</section>`;
}

function relationSection(title, entries, languageCode, emptyLabel) {
    return `<section class="library-detail-section"><h3>${escapeHtml(title)}</h3>${entries.length ? `<ul>${entries.map((entry) => `<li><a href="${entryUrl(entry, languageCode)}" ${entryAttributes(entry)}>${escapeHtml(entry.label)}</a></li>`).join("")}</ul>` : `<p>${escapeHtml(emptyLabel)}</p>`}</section>`;
}

function coreSections(detail, i18n, languageCode) {
    const { entry, references = [], usedBy = [] } = detail;
    const fields = entry.fields ?? {};
    const reserved = new Set([
        "definitions",
        "alternateDefinitions",
        "provenance",
        "scope",
        "revisions",
        "progress",
        "strokes",
    ]);
    const genericFields = Object.fromEntries(
        Object.entries(fields).filter(([key]) => !reserved.has(key)),
    );
    return [
        section(i18n.t("gateway.study.library_fields"), genericFields),
        section(
            i18n.t("gateway.study.library_definitions"),
            fields.definitions ?? entry.definitions,
        ),
        section(
            i18n.t("gateway.study.library_alternate_definitions"),
            fields.alternateDefinitions ?? entry.alternateDefinitions,
        ),
        section(
            i18n.t("gateway.study.library_provenance"),
            fields.provenance ?? entry.provenance,
        ),
        section(
            i18n.t("gateway.study.library_scope"),
            fields.scope ?? entry.scope,
        ),
        section(
            i18n.t("gateway.study.library_revisions"),
            fields.revisions ?? entry.revisions,
        ),
        relationSection(
            i18n.t("gateway.study.library_components"),
            references,
            languageCode,
            i18n.t("gateway.study.library_no_relationships"),
        ),
        relationSection(
            i18n.t("gateway.study.library_used_by"),
            usedBy,
            languageCode,
            i18n.t("gateway.study.library_no_relationships"),
        ),
        section(
            i18n.t("gateway.study.library_progress"),
            fields.progress ?? entry.progress,
        ),
        section(
            i18n.t("gateway.study.library_strokes"),
            fields.strokes ?? entry.strokes,
        ),
    ].filter(Boolean);
}

async function composeDetail(detail, i18n, languageCode) {
    const flow = await uiCtx.runFlow(DETAIL_FLOW, {
        detail,
        i18n,
        languageCode,
    });
    const sectionsFor = (stageId) =>
        (flow.stageResults[stageId] ?? []).flatMap((contribution) =>
            Array.isArray(contribution?.sections)
                ? contribution.sections.filter(Boolean)
                : [],
        );
    const actions = (flow.stageResults.actions ?? []).flatMap((contribution) =>
        Array.isArray(contribution?.actions) ? contribution.actions : [],
    );
    const sections = [
        ...sectionsFor("beforeCore"),
        ...coreSections(detail, i18n, languageCode),
        ...sectionsFor("core"),
        ...sectionsFor("afterCore"),
    ];
    return {
        body: `<div class="library-detail">${sections.join("")}</div>`,
        actions,
    };
}

function renderBrowser(schemas, entries, i18n, languageCode) {
    if (!schemas.length)
        return `<p>${escapeHtml(i18n.t("gateway.study.library_empty"))}</p>`;
    return schemas
        .map(
            (schema) =>
                `<section class="library-schema"><h2>${escapeHtml(localizedLabel(schema.metadata, schema.language))}</h2>${schema.layers
                    .map(
                        (layer) =>
                            `<section><h3>${escapeHtml(localizedLabel(layer.metadata, schema.language))}</h3><ul>${entries
                                .filter(
                                    (entry) =>
                                        entry.schemaId === schema.id &&
                                        entry.layer === layer.id,
                                )
                                .map(
                                    (entry) =>
                                        `<li><a href="${entryUrl(entry, languageCode)}" ${entryAttributes(entry)}>${escapeHtml(entry.label)}</a></li>`,
                                )
                                .join("")}</ul></section>`,
                    )
                    .join("")}</section>`,
        )
        .join("");
}

function parseEntryRoute() {
    const match = window.location.pathname.match(
        /^\/study\/library\/([^/]+)\/([^/]+)\/([^/]+)$/,
    );
    return match
        ? {
              schemaId: decodeURIComponent(match[1]),
              layerId: decodeURIComponent(match[2]),
              entryId: decodeURIComponent(match[3]),
          }
        : null;
}

function currentEntry() {
    const entry = history.state?.libraryEntry;
    if (entry?.schemaId && entry?.layerId && entry?.entryId) return entry;
    return parseEntryRoute();
}

async function openEntryPopup(route, entries, i18n, languageCode, signal) {
    const detail = await fetchLibraryEntry(route.entryId);
    if (
        detail.entry.schemaId !== route.schemaId ||
        detail.entry.layer !== route.layerId
    )
        throw new Error("entry_route_mismatch");
    const active = entries.filter(
        (entry) =>
            entry.schemaId === route.schemaId && entry.layer === route.layerId,
    );
    const index = active.findIndex((entry) => entry.id === route.entryId);
    const composed = await composeDetail(detail, i18n, languageCode);
    signal?.throwIfAborted();
    const origin = history.state?.libraryOrigin;
    const popupDepth = Number(history.state?.libraryPopupDepth ?? 0);
    let aborted = false;
    let dismissPopup;
    signal?.addEventListener(
        "abort",
        () => {
            aborted = true;
            dismissPopup?.();
        },
        { once: true },
    );
    const result = await openPopup({
        title: detail.entry.label,
        body: composed.body,
        maxWidth: "min(56rem, 94vw)",
        closeButtonVariant: "neutral",
        actions: [
            ...(index > 0
                ? [{ id: "previous", label: "←", variant: "neutral" }]
                : []),
            ...(index >= 0 && index < active.length - 1
                ? [{ id: "next", label: "→", variant: "neutral" }]
                : []),
            ...composed.actions,
        ],
        onOpen: (overlay, dismiss) => {
            dismissPopup = dismiss;
            overlay.addEventListener("click", (event) => {
                const link = event.target.closest("a[data-library-entry]");
                if (!link) return;
                event.preventDefault();
                event.stopPropagation();
                navigateTo(link.getAttribute("href"), {
                    state: {
                        libraryEntry: {
                            schemaId: link.dataset.librarySchema,
                            layerId: link.dataset.libraryLayer,
                            entryId: link.dataset.libraryEntry,
                        },
                        libraryOrigin: origin,
                        libraryPopupDepth: popupDepth + 1,
                    },
                });
            });
        },
        onAction: async (actionId, overlay, popupApi) => {
            if (actionId === null) return true;
            const target =
                actionId === "previous"
                    ? active[index - 1]
                    : actionId === "next"
                      ? active[index + 1]
                      : null;
            if (target) {
                navigateTo(entryUrl(target, languageCode), {
                    state: {
                        libraryEntry: {
                            schemaId: target.schemaId,
                            layerId: target.layer,
                            entryId: target.id,
                        },
                        libraryOrigin: origin,
                        libraryPopupDepth: popupDepth + 1,
                    },
                });
                return true;
            }
            const contributedAction = composed.actions.find(
                (action) => action.id === actionId,
            );
            if (typeof contributedAction?.onAction !== "function") return false;
            return contributedAction.onAction({
                actionId,
                detail,
                overlay,
                popupApi,
                languageCode,
            });
        },
    });
    if (!aborted && result !== "previous" && result !== "next") {
        if (origin && popupDepth > 0) {
            history.go(-popupDepth);
        } else {
            const libraryUrl = buildLibraryUrl(languageCode);
            history.replaceState({ routerPage: libraryUrl }, "", libraryUrl);
        }
    }
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
    const legacyRoute = parseEntryRoute();
    const route = currentEntry();
    if (legacyRoute) {
        const libraryUrl = buildLibraryUrl(languageCode);
        history.replaceState(
            {
                ...history.state,
                routerPage: libraryUrl,
                libraryEntry: legacyRoute,
            },
            "",
            libraryUrl,
        );
    }
    let schemas = [];
    let entries = [];
    try {
        if (rawLanguageCode !== null && !languageCode)
            throw new Error("invalid_language");
        schemas = await fetchLibrarySchemas(languageCode);
        entries = (
            await Promise.all(
                schemas.map((schema) =>
                    fetchLibraryEntries({
                        scope: "global",
                        schemaId: schema.id,
                    }),
                ),
            )
        ).flat();
    } catch {
        showToast(i18n.t("gateway.study.library_load_error"), {
            type: "error",
        });
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
                    `<section class="library-browser">${renderBrowser(schemas, entries, i18n, languageCode)}</section>`,
            },
        ],
        preferenceKey: "study-library-layout",
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: "/study/library",
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    root.addEventListener(
        "click",
        (event) => {
            const link = event.target.closest("a[data-library-entry]");
            if (!link) return;
            event.preventDefault();
            event.stopPropagation();
            navigateTo(link.getAttribute("href"), {
                state: {
                    libraryEntry: {
                        schemaId: link.dataset.librarySchema,
                        layerId: link.dataset.libraryLayer,
                        entryId: link.dataset.libraryEntry,
                    },
                    libraryOrigin: `${window.location.pathname}${window.location.search}`,
                    libraryPopupDepth: 1,
                },
            });
        },
        { signal },
    );
    if (route)
        void openEntryPopup(route, entries, i18n, languageCode, signal).catch(
            () =>
                showToast(i18n.t("gateway.study.library_load_error"), {
                    type: "error",
                }),
        );
}

await mountWhenDirect(mount);
