import { mountOfflineStudyPage } from "/static/gateways/study/offline-page.js";
import {
    readStudySnapshot,
    showOfflineContentNotice,
    isOfflineContentMiss,
} from "/static/gateways/study/offline-content.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { editDeck } from "./deck-editor.js";
import { sortItems, filterItems } from "/static/reuse/collection-view.js";
import { createPracticeModePreference } from "../reuse/practice-mode.js";
import {
    createPracticeSession,
    resumePracticeSession,
} from "./practice-session.js";
import { languageFlashcardsUrl } from "/static/gateways/study/reuse/explore.js";
import {
    flashcardsRoute,
    deckMatchesLanguage,
    deckRouteKey,
} from "./language.js";
import {
    practiceSummary,
    practiceQueue,
    supportsDeckWriting,
} from "./practice-model.js";
import { mountPractice } from "./practice.js";
import { runDeckAction } from "./actions.js";
import {
    loadDeckTemplates,
    renderDeckBrowser,
    renderDeckDetail,
    renderDeckPreviews,
    renderDeckCompletion,
} from "./markup.js";
import { replaceMountScope } from "/static/reuse/mount-scope.js";
import { loadFavourites } from "/static/gateways/study/reuse/favourites.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    loadStudySubNavigationModel,
    createStudySubNavigationSlot,
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
    deleteStudyDeck,
    reviewStudyCard,
} from "../decks-client.js";
import { flashcardValues, noteDetails } from "../reuse/flashcard.js";
import { exportAnkiNotes } from "../anki.js";

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
    const route = flashcardsRoute(location.pathname);
    let model;
    let decks;
    let schemas;
    let entries;
    let templates;
    try {
        [model, decks, schemas, templates] = await runDeckAction(
            "load",
            () =>
                Promise.all([
                    loadStudySubNavigationModel({
                        fallbackLanguageCode:
                            route.language ?? readSelectedStudyLanguageCode(),
                    }),
                    fetchStudyDecks(),
                    readStudySnapshot(() => fetchLibrarySchemas(), []),
                    loadDeckTemplates(signal),
                ]),
            signal,
        );
    } catch (error) {
        if (signal.aborted) return;
        if (
            isOfflineContentMiss(error) ||
            (isOffline() &&
                (error?.message === "deck_template_failed" ||
                    (error?.name === "TypeError" &&
                        /fetch/i.test(error.message))))
        ) {
            await mountOfflineStudyPage(root, {
                i18n,
                signal,
                title: i18n.t("adapter.study.flashcards.page_title"),
            });
            return;
        }
        showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
            variant: "error",
        });
        return;
    }
    if (isOffline() && decks.length === 0)
        showOfflineContentNotice(i18n, signal);
    const languageCode = model.selectedLanguageCode;
    if (route.language !== languageCode && languageCode) {
        await navigateTo(languageFlashcardsUrl(languageCode));
        return;
    }
    schemas = schemas.filter((schema) => schema.language === languageCode);
    decks = decks.filter((deck) => deckMatchesLanguage(deck, languageCode));
    const requestedId = route.deckId;
    decks = decks.map((deck) => ({
        ...deck,
        name: deck.names?.[document.documentElement.lang] ?? deck.name,
    }));
    let selected = decks.find((deck) => requestedId?.endsWith(`--${deck.id}`));
    let favourites;
    try {
        favourites = await loadFavourites();
    } catch (error) {
        if (!isOfflineContentMiss(error)) throw error;
        await mountOfflineStudyPage(root, {
            i18n,
            signal,
            title: i18n.t("adapter.study.flashcards.page_title"),
        });
        return;
    }
    let sortOrder = "default";
    let favouritesOnly = false;
    let deckQuery = "";
    let queue = [];
    let practiceSession = createPracticeSession([]);
    const savedSession = history.state?.studyDeckSession;
    const restoredSession =
        savedSession?.deckId === selected?.id &&
        ["reading", "writing"].includes(savedSession?.mode)
            ? savedSession
            : null;
    let practiceMode = restoredSession?.mode;
    let session = null;
    let filter = ["total", "new", "due", "done"].includes(
        restoredSession?.filter,
    )
        ? restoredSession.filter
        : "total";
    let releasePractice;
    let generation = 0;
    const visibleDecks = () => {
        return sortItems(
            filterItems(decks, {
                query: deckQuery,
                text: (deck) => deck.name,
                predicates: [
                    (deck) =>
                        !favouritesOnly || favourites.has("deck", deck.id),
                ],
            }),
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
        target.innerHTML = renderDeckDetail(
            templates,
            selected,
            practiceSummary(session?.cards ?? [], selected.progress),
            filter,
            i18n,
        );
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
                                contentUrl: languageFlashcardsUrl(
                                    languageCode,
                                    deckRouteKey(selected),
                                ),
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
    const persistSession = () => {
        if (!selected || !practiceMode) return;
        history.replaceState(
            {
                ...history.state,
                studyDeckSession: {
                    deckId: selected.id,
                    mode: practiceMode,
                    filter,
                    ...practiceSession.snapshot(),
                },
            },
            "",
            location.pathname,
        );
    };
    const nextCard = () => {
        persistSession();
        const favourite = root.querySelector("[data-deck-favourite]");
        if (favourite) favourite.hidden = queue.length > 0;
        const target = root.querySelector("[data-study-session]");
        releasePractice?.();
        const current = ++generation;
        if (!practiceSession.current) {
            target.innerHTML = renderDeckCompletion(
                templates,
                i18n,
                practiceQueue(session.cards, selected.progress, filter).length >
                    0,
            );
            return;
        }
        const detail = practiceSession.current;
        let pendingReview;
        const reviewedSession = practiceSession;
        const reviewedDeck = session;
        const recordAnswer = async (grade) => {
            reviewedSession.answer(grade);
            const attempt = reviewedSession.reviewAttempt;
            persistSession();
            if (!grade || reviewedSession.answered) return true;
            if (!pendingReview)
                pendingReview = runDeckAction("review", async () => {
                    const updated = await reviewStudyCard(
                        reviewedDeck.deck.id,
                        detail.entry.id,
                        grade,
                        attempt,
                    );
                    if (!updated?.queued) {
                        reviewedDeck.deck = updated;
                        if (session === reviewedDeck) selected = updated;
                    }
                    reviewedSession.record(grade, detail.entry.id);
                    if (!signal.aborted && current === generation)
                        persistSession();
                    return true;
                })
                    .catch(() => {
                        if (!signal.aborted)
                            showToast(
                                i18n.t(
                                    "adapter.study.flashcards.deck_review_error",
                                ),
                                { variant: "error" },
                            );
                        return false;
                    })
                    .finally(() => {
                        pendingReview = undefined;
                    });
            return pendingReview;
        };
        releasePractice = mountPractice(target, {
            detail,
            templates,
            entries,
            schemas,
            mode: practiceMode,
            navigationEntryIds: queue.map(({ entry }) => entry.id),
            onDeparture: recordAnswer,
            onAnswer: recordAnswer,
            answeredGrade: practiceSession.answeredGrade,
            onPrevious: practiceSession.canPrevious
                ? () => {
                      practiceSession.previous();
                      nextCard();
                  }
                : null,
            i18n,
            signal,
            onNext: async (grade) => {
                try {
                    if (!(await recordAnswer(grade))) return;
                    if (signal.aborted || current !== generation) return;
                    practiceSession.next(grade);
                    const summary = practiceSummary(
                        session.cards,
                        selected.progress,
                    );
                    root.querySelectorAll("[data-practice-filter]").forEach(
                        (button) => {
                            button.querySelector("strong").textContent =
                                summary[button.dataset.practiceFilter];
                        },
                    );
                    nextCard();
                } catch {
                    showToast(
                        i18n.t("adapter.study.flashcards.deck_review_error"),
                        { variant: "error" },
                    );
                }
            },
        });
    };
    const loadEntries = async () => {
        if (entries) return;
        const { readable } = await fetchLibraryLocations();
        entries = (
            await Promise.all(
                readable.flatMap((location) =>
                    schemas.map((schema) =>
                        fetchLibraryEntries({
                            ...location,
                            schemaId: schema.id,
                        }),
                    ),
                ),
            )
        ).flat();
    };
    const loadSession = async () => {
        session = await fetchStudyDeck(selected.id);
        session.cards = [
            ...session.cards.filter(({ entry }) =>
                schemas.some((schema) => schema.id === entry.schemaId),
            ),
            ...noteDetails(session.deck.notes),
        ];
        selected = {
            ...session.deck,
            name:
                session.deck.names?.[document.documentElement.lang] ??
                session.deck.name,
        };
        await loadEntries();
        signal.throwIfAborted();
        if (session.unavailable)
            showToast(
                i18n
                    .t("adapter.study.flashcards.deck_unavailable")
                    .replace("{{ count }}", String(session.unavailable)),
                { variant: "warning" },
            );
        modePreference.setWritingAvailable(
            supportsDeckWriting(session.cards, entries, schemas),
        );
        practiceMode = modePreference.value;
        queue = practiceQueue(session.cards, selected.progress, filter);
        const snapshot =
            restoredSession?.mode === practiceMode
                ? restoredSession
                : undefined;
        const restored = resumePracticeSession(
            snapshot ? session.cards : queue,
            snapshot,
        );
        queue = restored.queue;
        practiceSession = restored.session;
        renderDeck();
        nextCard();
        if (!restoredSession)
            root.querySelector("[data-study-deck]").scrollIntoView({
                behavior: "instant",
                block: "start",
            });
    };

    const modePreference = await createPracticeModePreference({
        i18n,
        templates,
        signal,
        mode: practiceMode,
        isActive: () => Boolean(selected && practiceSession.current),
        onChange: (mode) => {
            practiceMode = mode;
            if (!session) return;
            queue = practiceQueue(session.cards, selected.progress, filter);
            practiceSession = createPracticeSession(queue);
            nextCard();
        },
    });
    if (selected) modePreference.setWritingAvailable(false);
    practiceMode = modePreference.value;
    const menu = createSideMenu({
        groups: [
            {
                id: "decks",
                label: i18n.t("adapter.study.flashcards.page_title"),
                collapsible: false,
                items: [
                    { id: "all", label: i18n.t("ui.reuse.all") },
                    ...decks.map((deck) => ({ id: deck.id, label: deck.name })),
                ],
            },
        ],
        activeId: selected?.id ?? "all",
        storageKeyPrefix: "study-flashcards-decks",
        onSelect: (id) =>
            runDeckAction(
                "browse",
                () =>
                    navigateTo(
                        languageFlashcardsUrl(
                            languageCode,
                            id === "all"
                                ? undefined
                                : deckRouteKey(
                                      decks.find((deck) => deck.id === id),
                                  ),
                        ),
                    ),
                signal,
            ),
    });
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
        toolbar: [
            {
                id: "study-flashcard-decks",
                label: i18n.t("adapter.study.flashcards.page_title"),
                render: () => menu.render(),
            },
        ],
        toolbarScrollable: true,
        floatingMenu: [modePreference],
        subNavigation: [createStudySubNavigationSlot(model, i18n)],
    });
    await composer.init();
    signal?.throwIfAborted();
    menu.mount(root, { signal });
    modePreference.mount(composer.getFloatingSlot(modePreference.id));
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
            if (!event.target.matches("[data-study-query]")) return;
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
        },
        { signal },
    );
    root.addEventListener(
        "click",
        async (event) => {
            if (event.target.closest("[data-practice-restart]")) {
                await runDeckAction(
                    "restart",
                    () => {
                        queue = practiceQueue(
                            session.cards,
                            selected.progress,
                            filter,
                        );
                        practiceSession = createPracticeSession(queue);
                        nextCard();
                    },
                    signal,
                );
                return;
            }
            const filterButton = event.target.closest("[data-practice-filter]");
            if (filterButton) {
                await runDeckAction(
                    "filter",
                    () => {
                        filter = filterButton.dataset.practiceFilter;
                        releasePractice?.();
                        queue = practiceQueue(
                            session.cards,
                            selected.progress,
                            filter,
                        );
                        practiceSession = createPracticeSession(queue);
                        renderDeck();
                        nextCard();
                    },
                    signal,
                );
                return;
            }
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
                await runDeckAction(
                    "browse",
                    () =>
                        navigateTo(
                            languageFlashcardsUrl(
                                languageCode,
                                deckRouteKey(
                                    decks.find(
                                        (deck) =>
                                            deck.id ===
                                            preview.dataset.deckOpen,
                                    ),
                                ),
                            ),
                        ),
                    signal,
                );
                return;
            }
            const button = event.target.closest("[data-deck-action]");
            if (!button) return;
            button.disabled = true;
            try {
                let action = button.dataset.deckAction;
                await runDeckAction(action, async () => {
                    if (action === "browse") {
                        await navigateTo(languageFlashcardsUrl(languageCode));
                        return;
                    }
                    if (action === "add") {
                        const choice = await openPopup({
                            title: i18n.t(
                                "adapter.study.flashcards.page_title",
                            ),
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
                        await loadEntries();
                        const edit = () =>
                            editDeck(
                                action === "edit" ? selected : null,
                                schemas,
                                entries,
                                i18n,
                                action === "import",
                                languageCode,
                            );
                        if (button.dataset.deckAction === "add")
                            await runDeckAction(action, edit, signal);
                        else await edit();
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
                            await navigateTo(
                                languageFlashcardsUrl(languageCode),
                            );
                        }
                        return;
                    }
                    const exportSession = await fetchStudyDeck(selected.id);
                    const notes = exportSession.deck.notes.map((note) => ({
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
                        if (!exportSession.deck.canExport) return;
                        const all = [...exportSession.cards, ...notes];
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
                });
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
    signal.addEventListener("abort", () => releasePractice?.(), { once: true });
    if (selected) {
        try {
            await runDeckAction("load", loadSession, signal);
        } catch (error) {
            if (isOfflineContentMiss(error))
                showOfflineContentNotice(i18n, signal);
            else
                showToast(i18n.t("adapter.study.flashcards.deck_load_error"), {
                    variant: "error",
                });
        }
    }
}

await mountWhenDirect(mount);
