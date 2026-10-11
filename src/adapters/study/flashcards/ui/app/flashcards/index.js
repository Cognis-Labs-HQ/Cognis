import { isCardDue } from "../../reuse/review.js";
import { createSearchMatchResolver } from "/static/reuse/search-util/matching.js";
import {
    loadDeckTemplates,
    renderDeckBrowser,
    renderDeckDetail,
    renderDeckPreviews,
} from "./markup.js";
import { replaceMountScope } from "/static/reuse/mount-scope.js";
import {
    loadFavourites,
    renderFavourite,
    sortItems,
} from "/static/gateways/study/reuse/favourites.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
    bindStudySubNavigation,
    readSelectedStudyLanguageCode,
} from "/static/gateways/study/sub-navigation.js";
import {
    fetchLibraryLocations,
    fetchLibrarySchemas,
    fetchLibraryEntries,
} from "/static/gateways/study/library-client.js";
import {
    fetchStudyDecks,
    fetchStudyDeck,
    saveStudyDeck,
    deleteStudyDeck,
    reviewStudyCard,
} from "../../decks-client.js";
import {
    renderFlashcard,
    mountFlashcard,
    flashcardValues,
} from "../../reuse/flashcard.js";
import { parseAnkiNotes, exportAnkiNotes } from "../../anki.js";

function download(name, text) {
    const url = URL.createObjectURL(
        new Blob([text], { type: "text/tab-separated-values;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    URL.revokeObjectURL(url);
}

async function editDeck(deck, schemas, entries, i18n, importing = false) {
    let form;
    let saved = false;
    let notes = deck?.notes ?? [];
    const layers = schemas.flatMap((schema) =>
        schema.layers.map((layer) => ({
            id: `${schema.id}:${layer.id}`,
            label:
                layer.metadata?.labels?.[document.documentElement.lang] ??
                layer.id,
        })),
    );
    const ids = new Set(deck?.entryIds ?? []);
    const label = (entry) =>
        `${entry.label} · ${layers.find((layer) => layer.id === `${entry.schemaId}:${entry.layer}`)?.label ?? entry.layer}`;
    const renderChoices = () => {
        const layer = form.elements.layer.value;
        const query = form.elements.query.value.trim().toLocaleLowerCase();
        form.querySelector("[data-deck-picker]").innerHTML = entries
            .filter(
                (entry) =>
                    (layer
                        ? `${entry.schemaId}:${entry.layer}` === layer
                        : !entry.hidden) &&
                    label(entry).toLocaleLowerCase().includes(query),
            )
            .map(
                (entry) =>
                    `<label><input type="checkbox" data-deck-entry="${escapeHtml(entry.id)}"${ids.has(entry.id) ? " checked" : ""}><span>${escapeHtml(label(entry))}</span></label>`,
            )
            .join("");
    };
    await openPopup({
        title: i18n.t(
            importing
                ? "adapter.study.flashcards.deck_import"
                : deck
                  ? "adapter.study.flashcards.deck_edit"
                  : "adapter.study.flashcards.deck_create",
        ),
        maxWidth: "64rem",
        closeProtection: true,
        body: createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "study-deck-editor",
                formClassName: "study-deck-editor",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "name",
                        required: true,
                        labelKey: "ui.reuse.name",
                        value: deck?.name ?? "",
                        criteria: [
                            {
                                id: "nameMax",
                                type: "maxLength",
                                value: 100,
                                messageKey:
                                    "adapter.study.flashcards.deck_save_error",
                            },
                        ],
                    },
                    ...(importing
                        ? [
                              {
                                  name: "file",
                                  type: "file",
                                  required: true,
                                  labelKey: "ui.reuse.file",
                                  attributes: {
                                      accept: ".tsv,.txt,text/tab-separated-values,text/plain",
                                  },
                              },
                          ]
                        : []),
                    {
                        name: "layer",
                        type: "select",
                        labelKey: "adapter.study.flashcards.deck_layer",
                        options: [
                            { value: "", label: i18n.t("ui.reuse.all") },
                            ...layers.map((layer) => ({
                                value: layer.id,
                                label: layer.label,
                            })),
                        ],
                    },
                    {
                        name: "query",
                        type: "search",
                        labelKey: "ui.reuse.search",
                    },
                ],
            },
        ).render(),
        actions: [
            { id: "save", label: i18n.t("ui.reuse.save"), variant: "confirm" },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            form = overlay.querySelector("#study-deck-editor");
            const picker = document.createElement("div");
            picker.className = "study-deck-picker";
            picker.dataset.deckPicker = "";
            form.appendChild(picker);
            renderChoices();
            form.elements.layer.addEventListener("change", renderChoices);
            form.elements.query.addEventListener("input", renderChoices);
            form.querySelector("[data-deck-picker]").addEventListener(
                "change",
                (event) => {
                    const id = event.target.dataset.deckEntry;
                    if (id) event.target.checked ? ids.add(id) : ids.delete(id);
                },
            );
        },
        onAction: async (action) => {
            if (action !== "save") return true;
            if (!form.reportValidity()) return false;
            try {
                if (importing)
                    notes = parseAnkiNotes(
                        await form.elements.file.files[0].text(),
                    );
                await saveStudyDeck(
                    {
                        name: form.elements.name.value,
                        entryIds: [...ids],
                        notes,
                    },
                    deck?.id,
                );
                showToast(i18n.t("adapter.study.flashcards.deck_saved"), {
                    variant: "success",
                });
                saved = true;
                return true;
            } catch {
                showToast(i18n.t("adapter.study.flashcards.deck_save_error"), {
                    variant: "error",
                });
                return false;
            }
        },
    });
    if (saved) await navigateTo("/study/flashcards");
}

let mountController = null;

export async function mount(root, { signal: routerSignal } = {}) {
    mountController = replaceMountScope(mountController, routerSignal);
    const controller = mountController;
    const signal = controller.signal;
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { signal, once: true },
    );
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/flashcards/languages",
            "/static/gateways/share/languages",
        ],
    });
    applyDocumentTitle(i18n, "adapter.study.flashcards.page_title");
    let model;
    let decks;
    let schemas;
    let entries;
    let templates;
    try {
        [model, decks, schemas, templates] = await Promise.all([
            loadStudySubNavigationModel({
                fallbackLanguageCode: readSelectedStudyLanguageCode(),
            }),
            fetchStudyDecks(),
            fetchLibrarySchemas(),
            loadDeckTemplates(signal),
        ]);
    } catch {
        if (signal.aborted) return;
        showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
            variant: "error",
        });
        return;
    }
    const requestedId = location.pathname.split("/")[3];
    if (requestedId && !decks.some((deck) => deck.id === requestedId)) {
        try {
            decks.push((await fetchStudyDeck(requestedId)).deck);
        } catch {
            showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
                variant: "error",
            });
        }
    }
    decks = decks.map((deck) => ({
        ...deck,
        name: deck.names?.[document.documentElement.lang] ?? deck.name,
    }));
    let selected = decks.find((deck) => deck.id === requestedId);
    const favourites = await loadFavourites();
    let sortOrder = "default";
    let favouritesOnly = false;
    let deckQuery = "";
    let queue = [];
    let session = null;
    let dueOnly = true;
    let generation = 0;
    const visibleDecks = () => {
        const match = createSearchMatchResolver(deckQuery);
        return sortItems(
            decks.filter(
                (deck) =>
                    (!favouritesOnly || favourites.has("deck", deck.id)) &&
                    (!deckQuery || match(deck.name)),
            ),
            sortOrder,
        );
    };
    const renderDeck = () => {
        const target = root.querySelector("[data-study-deck]");
        if (!target) return;
        if (!selected) {
            target.innerHTML = renderDeckBrowser(
                templates,
                visibleDecks(),
                i18n,
                deckQuery,
            );
            const select = target.querySelector("[data-study-sort]");
            select.value = sortOrder;
            const toggle = target.querySelector("[data-study-favourites-only]");
            toggle.classList.toggle("is-favourite", favouritesOnly);
            toggle.setAttribute("aria-pressed", String(favouritesOnly));
            toggle.textContent = favouritesOnly ? "★" : "☆";
            return;
        }
        target.innerHTML = renderDeckDetail(templates, selected, dueOnly, i18n);
        if (selected.canEdit && uiCtx.capabilities.get("share:openPopup"))
            uiCtx.capabilities
                .get("share:uiGateway")
                ?.mountTrigger(target.querySelector("[data-deck-share]"), {
                    signal,
                    onActivate: async () => {
                        try {
                            const openSharePopup =
                                uiCtx.capabilities.get("share:openPopup");
                            await openSharePopup({
                                resourceType: "studyDeck",
                                resourceId: selected.id,
                                contentUrl: `/study/flashcards/${selected.id}`,
                                grantedCapabilities: ["study:flashcards:read"],
                                supportsReadOnly: true,
                                allowedPermissions: ["read"],
                                title: selected.name,
                            });
                        } catch {
                            showToast(
                                i18n.t(
                                    "adapter.study.flashcards.deck_save_error",
                                ),
                                { variant: "error" },
                            );
                        }
                    },
                });
    };
    const nextCard = () => {
        const favourite = root.querySelector("[data-deck-favourite]");
        if (favourite) favourite.hidden = queue.length > 0;
        const target = root.querySelector("[data-study-session]");
        if (!queue.length) {
            target.innerHTML = `<p>${escapeHtml(i18n.t("adapter.study.flashcards.deck_finished"))}</p>`;
            return;
        }
        const detail = queue[0];
        target.innerHTML = renderFlashcard(
            detail,
            schemas,
            entries,
            i18n,
            document.documentElement.lang,
            { favourites: true },
        );
        const current = ++generation;
        mountFlashcard(target, {
            signal,
            onGrade: async (grade) => {
                try {
                    const updated = await reviewStudyCard(
                        session.deck.id,
                        detail.entry.id,
                        grade,
                    );
                    if (current !== generation) return;
                    selected = updated;
                    session.deck = updated;
                    queue.shift();
                    nextCard();
                } catch {
                    showToast(
                        i18n.t("adapter.study.flashcards.deck_review_error"),
                        {
                            variant: "error",
                        },
                    );
                }
            },
        });
    };
    const composer = createPageComposer(root, {
        allowCustomization: false,
        contentScrolling: false,
        i18n,
        preferenceKey: "study-flashcards-layout",
        pageContext: {
            title: i18n.t("adapter.study.flashcards.page_title"),
            subtitle: i18n.t("adapter.study.flashcards.page_subtitle"),
        },
        elements: [
            {
                id: "study-deck",
                label: i18n.t("adapter.study.flashcards.page_title"),
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => "<section data-study-deck></section>",
            },
        ],
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: location.pathname,
                        i18n,
                    }),
            },
        ],
    });
    await composer.init();
    signal?.throwIfAborted();
    favourites.bind(root, {
        signal,
        i18n,
        onChange: () => {
            if (!selected) renderDeck();
        },
    });
    bindStudySubNavigation(root, { signal, i18n });
    renderDeck();
    root.addEventListener(
        "input",
        (event) => {
            if (!event.target.matches("[data-deck-query]")) return;
            deckQuery = event.target.value;
            root.querySelector(".study-deck-browser").innerHTML =
                renderDeckPreviews(templates, visibleDecks(), i18n);
        },
        { signal },
    );
    root.addEventListener(
        "change",
        (event) => {
            if (event.target.matches("[data-study-sort]")) {
                sortOrder = event.target.value;
                renderDeck();
            }
            if (event.target.matches("[data-deck-due]"))
                dueOnly = event.target.checked;
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            const favouriteToggle = event.target.closest(
                "[data-study-favourites-only]",
            );
            if (favouriteToggle) {
                favouritesOnly = !favouritesOnly;
                renderDeck();
                return;
            }
            const preview = event.target.closest("[data-deck-open]");
            if (preview) {
                await navigateTo(
                    `/study/flashcards/${preview.dataset.deckOpen}`,
                );
                return;
            }
            const button = event.target.closest("[data-deck-action]");
            if (!button) return;
            button.disabled = true;
            try {
                let action = button.dataset.deckAction;
                if (action === "browse") {
                    await navigateTo("/study/flashcards");
                    return;
                }
                if (action === "add") {
                    const choice = await openPopup({
                        title: i18n.t("adapter.study.flashcards.page_title"),
                        body: "",
                        actions: [
                            {
                                id: "create",
                                label: i18n.t(
                                    "adapter.study.flashcards.deck_create",
                                ),
                                variant: "neutral",
                            },
                            {
                                id: "import",
                                label: i18n.t(
                                    "adapter.study.flashcards.deck_import",
                                ),
                                variant: "neutral",
                            },
                        ],
                    });
                    if (!choice) return;
                    action = choice;
                }
                if (["create", "edit", "import"].includes(action)) {
                    if (!entries) {
                        const { readable } = await fetchLibraryLocations();
                        entries = (
                            await Promise.all(
                                readable.map((location) =>
                                    fetchLibraryEntries(location),
                                ),
                            )
                        ).flat();
                    }
                    await editDeck(
                        action === "edit" ? selected : null,
                        schemas,
                        entries,
                        i18n,
                        action === "import",
                    );
                    return;
                }
                if (action === "delete") {
                    const choice = await openPopup({
                        title: i18n.t("ui.reuse.delete"),
                        body: escapeHtml(selected.name),
                        actions: [
                            {
                                id: "delete",
                                label: i18n.t("ui.reuse.delete"),
                                variant: "cancel",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "neutral",
                            },
                        ],
                    });
                    if (choice === "delete") {
                        await deleteStudyDeck(selected.id);
                        showToast(
                            i18n.t("adapter.study.flashcards.deck_deleted"),
                            {
                                variant: "success",
                            },
                        );
                        await navigateTo("/study/flashcards");
                    }
                    return;
                }
                session = await fetchStudyDeck(selected.id);
                const notes = session.deck.notes.map((note) => ({
                    entry: {
                        id: note.id,
                        label: note.front,
                        fields: {
                            definition: note.back,
                            pronunciation: note.pronunciation,
                        },
                    },
                    references: [],
                }));
                if (action === "export") {
                    if (!session.deck.canExport) return;
                    const all = [...session.cards, ...notes];
                    download(
                        `${selected.name.replace(/[^\p{L}\p{N}._-]/gu, "_")}.tsv`,
                        exportAnkiNotes(
                            selected.name,
                            all.map((detail) => ({
                                ...flashcardValues(
                                    detail,
                                    schemas,
                                    document.documentElement.lang,
                                ),
                                context: detail,
                            })),
                        ),
                    );
                    return;
                }
                if (session.unavailable)
                    showToast(
                        i18n
                            .t("adapter.study.flashcards.deck_unavailable")
                            .replace(
                                "{{ count }}",
                                String(session.unavailable),
                            ),
                        { variant: "warning" },
                    );
                queue = [...session.cards, ...notes].filter(
                    (detail) =>
                        !dueOnly ||
                        isCardDue(session.deck.progress, detail.entry.id),
                );
                nextCard();
            } catch {
                showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
                    variant: "error",
                });
            } finally {
                if (button.isConnected) button.disabled = false;
            }
        },
        { signal },
    );
}

await mountWhenDirect(mount);
