import { markEntryViewed } from "./viewed-entries.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { bindEntryDetail, releaseEntryMedia } from "./detail-layout.js";
import { openPopup } from "/static/reuse/popup.js";
import { loadEntryDetail } from "./entry-data.js";
import { composeDetail } from "./detail.js";
import { isMeaningLayer, layerForEntry } from "./presentation.js";
import {
    popupTitleDetailItems,
    popupTitleItems,
    hasReadingDetails,
    withParentTitleAttribution,
} from "./popup-title.js";
import {
    popupEntryNavigationState,
    popupNavigationActions,
    resolvePopupNavigation,
} from "./popup-navigation.js";
import { titleDefinitionForRole } from "./title-definition.js";
import { openLibraryEntryEditor } from "./admin-interactions/index.js";
import { popupEntryEditMode } from "./editability.js";
import { transformedPopupPresentation as transformPresentation } from "./transformation-popup.js";
import {
    detailTitleReferences,
    resolveDetailTransformation,
    selectDetailTransformation,
    transformedDetailEntry,
    transformedParentAttribution,
} from "./transformation-detail.js";
import {
    canDraw,
    resolveDraw,
    openDrawing,
    drawingHeaderActions,
} from "./drawing.js";

export async function openEntryPopup(
    root,
    initialEntry,
    schemas,
    entries,
    i18n,
    languageCode,
    signal,
    options = {},
) {
    if (isMeaningLayer(layerForEntry(schemas, initialEntry))) return;
    let selectedEntry = initialEntry;
    let sourceDefinition = "";
    let selectedTransformation =
        options.transformation === undefined
            ? null
            : resolveDetailTransformation(
                  initialEntry,
                  schemas.find(({ id }) => id === initialEntry.schemaId),
                  options.transformation,
              );
    while (selectedEntry && !signal?.aborted) {
        const detail = await loadEntryDetail(
            selectedEntry.id,
            entries,
            options.detail,
        );
        signal?.throwIfAborted();
        const layer = layerForEntry(schemas, detail.entry);
        const titleReferences = detailTitleReferences(
            detail,
            schemas,
            entries,
            selectedTransformation,
        );
        const editMode =
            !isOffline() &&
            popupEntryEditMode(selectedEntry, initialEntry, options);
        const handleSaved = (updated) => {
            if (editMode !== "direct") return;
            Object.assign(selectedEntry, updated);
            options.onEntryUpdated?.(updated);
        };
        if (options.startEditing && editMode) {
            options.startEditing = false;
            await openLibraryEntryEditor({
                entry: detail.entry,
                entries,
                schemas,
                i18n,
                requestUpdate: editMode === "request",
                onSaved: handleSaved,
                persistDraft: options.persistDraft,
                onOpened: () => {
                    void markEntryViewed(root, detail.entry, entries, i18n);
                },
            });
            continue;
        }
        const schema = schemas.find(
            (candidate) => candidate.id === selectedEntry.schemaId,
        );
        const { active, index } = popupEntryNavigationState(
            entries,
            selectedEntry,
            schema,
            layer,
            options.navigationEntryIds,
        );
        const composed = await composeDetail(
            detail,
            schemas,
            entries,
            i18n,
            languageCode,
            { ...options, transformation: selectedTransformation },
        );
        signal?.throwIfAborted();
        let titleDetailItems = popupTitleDetailItems(
            detail,
            schemas,
            composed.titleDefinition,
            sourceDefinition,
            titleReferences,
            entries,
        );
        const transformed = transformPresentation(
            selectedTransformation,
            detail.entry,
            schema,
            titleDetailItems,
            composed.body,
            composed.definitions,
            schemas,
            entries,
        );
        titleDetailItems = transformed.titleDetailItems;
        titleDetailItems = transformedParentAttribution(
            titleDetailItems,
            detail.entry,
            selectedTransformation,
            i18n.t("gateway.study.library_from_parent"),
        );
        composed.body = selectedTransformation
            ? composed.renderBody(transformed.definitions)
            : transformed.body;
        const displayedDefinition = titleDefinitionForRole(
            layer?.semanticRole,
            transformed.definitions?.[0] ?? composed.titleDefinition,
            sourceDefinition,
        );
        const displayedEntry = transformedDetailEntry(
            detail.entry,
            selectedTransformation,
            schema,
        );
        const strokePattern = resolveDraw(displayedEntry, layer, {
            entries,
            schemas,
        });
        titleDetailItems = withParentTitleAttribution(
            titleDetailItems,
            detail.entry,
            layer,
            schemas,
            entries,
            i18n.t("gateway.study.library_from_parent"),
        );
        let dismissPopup, relatedEntry, chosenTransformation;
        const audioObjectUrls = new Set();
        const audioController = new AbortController();
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: transformed.title,
            titleLeading: composed.titleLeading,
            titleItems: popupTitleItems(titleReferences),
            titleDetailItems,
            stackTitleDetailOnOverflow: true,
            headingLayout: hasReadingDetails(titleDetailItems)
                ? "annotated"
                : "inline",
            headerActions: [
                ...drawingHeaderActions(strokePattern, i18n),
                ...(editMode && !selectedTransformation
                    ? [
                          {
                              id: "edit",
                              label: i18n
                                  .t("gateway.study.library_admin_edit")
                                  .replace("{{ entry }}", detail.entry.label),
                              icon: {
                                  light: "/static/adapters/study/library/assets/edit-light.svg",
                                  dark: "/static/adapters/study/library/assets/edit-dark.svg",
                              },
                          },
                      ]
                    : []),
            ],
            body: composed.body,
            maxWidth: "min(56rem, 94vw)",
            closeButtonVariant: "neutral",
            actions: [
                ...popupNavigationActions(index, active.length, i18n),
                ...composed.actions,
            ],
            onOpen: (overlay, dismiss, popupApi) => {
                void markEntryViewed(root, detail.entry, entries, i18n);
                dismissPopup = dismiss;
                overlay.classList.add("library-entry-popup");
                bindEntryDetail(overlay, displayedEntry, {
                    signal: audioController.signal,
                    popupApi,
                    requestId:
                        selectedEntry.id === initialEntry.id
                            ? options.requestId
                            : undefined,
                    audioObjectUrls,
                    imageError: i18n.t(
                        "adapter.study.library.images_load_error",
                    ),
                    audioError: i18n.t(
                        "gateway.study.library_audio_load_error",
                    ),
                });
                overlay.addEventListener("click", (event) => {
                    if (
                        selectDetailTransformation(event, {
                            entry: detail.entry,
                            schema,
                            i18n,
                            definitions: composed.definitions,
                            onSelected: (transformation) => {
                                chosenTransformation = transformation;
                                void dismiss();
                            },
                        })
                    )
                        return;
                    const control = event.target.closest(
                        "button[data-library-entry]",
                    );
                    if (!control) return;
                    relatedEntry = entries.find(
                        (entry) => entry.id === control.dataset.libraryEntry,
                    );
                    void dismiss();
                });
            },
            onAction: async (actionId, overlay, popupApi) => {
                if (actionId === "draw" && canDraw(strokePattern)) {
                    await openDrawing(
                        displayedEntry,
                        strokePattern,
                        displayedDefinition,
                    );
                    return true;
                }
                const contributedAction = composed.actions.find(
                    (action) => action.id === actionId,
                );
                if (typeof contributedAction?.onAction !== "function")
                    return true;
                return contributedAction.onAction({
                    actionId,
                    detail,
                    overlay,
                    popupApi,
                    languageCode,
                });
            },
        });
        releaseEntryMedia(audioController, audioObjectUrls, signal, abortPopup);
        if (chosenTransformation !== undefined) {
            selectedTransformation = chosenTransformation;
            selectedEntry = detail.entry;
            sourceDefinition = "";
            continue;
        }
        if (result === "edit" && editMode && !isOffline()) {
            await openLibraryEntryEditor({
                entry: detail.entry,
                entries,
                schemas,
                i18n,
                requestUpdate: editMode === "request",
                onSaved: handleSaved,
                persistDraft: options.persistDraft,
            });
            selectedEntry = detail.entry;
            continue;
        }
        const navigation = resolvePopupNavigation({
            result,
            relatedEntry,
            entries,
            active,
            index,
            schemas,
            displayedDefinition,
        });
        selectedEntry = navigation.entry;
        sourceDefinition = navigation.sourceDefinition;
        selectedTransformation = resolveDetailTransformation(
            selectedEntry,
            schema,
            navigation.transformation,
            detail.entry.label,
        );
    }
}
