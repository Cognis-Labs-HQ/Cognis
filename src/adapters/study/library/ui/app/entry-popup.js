import { openPopup } from "/static/reuse/popup.js";
import { fetchLibraryEntry } from "/static/gateways/study/ui/library-client.js";
import { composeDetail } from "./detail.js";
import { resolveLabelComposition } from "./composition-links.js";
import {
    headingCompositionReferences,
    isMeaningLayer,
    layerForEntry,
    loadLibraryAudio,
} from "./presentation.js";
import {
    hasReadingDetails,
    popupTitleDetailItems,
    popupTitleItems,
    withParentTitleAttribution,
} from "./popup-title.js";
import {
    popupEntryNavigationState,
    resolvePopupNavigation,
} from "./popup-navigation.js";
import { titleDefinitionForRole } from "./title-definition.js";
import { openLibraryEntryEditor } from "./admin-interactions.js";
import { entryEditMode } from "./editability.js";
import { transformedPopupPresentation as transformPresentation } from "./transformation-popup.js";
import {
    resolveDetailTransformation,
    selectDetailTransformation,
    transformedDetailEntry,
    transformedParentAttribution,
} from "./transformation-detail.js";
import { canDraw, resolveDraw, openDrawing } from "./drawing.js";
import { drawingHeaderActions, placeAudioSpeaker } from "./drawing.js";
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
    let selectedTransformation = null;
    while (selectedEntry && !signal?.aborted) {
        const detail = await fetchLibraryEntry(selectedEntry.id);
        const explicitTitleReferences = headingCompositionReferences(
            detail,
            schemas,
        );
        const titleReferences =
            !selectedTransformation && explicitTitleReferences.length
                ? explicitTitleReferences
                : resolveLabelComposition(
                      selectedTransformation?.node.value ?? detail.entry.label,
                      detail.entry,
                      schemas,
                      entries,
                  );
        const layer = layerForEntry(schemas, selectedEntry);
        const editMode = options.readOnly ? null : entryEditMode(selectedEntry);
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
        );
        const composed = await composeDetail(
            detail,
            schemas,
            entries,
            i18n,
            languageCode,
            { ...options, transformation: selectedTransformation },
        );
        if (options.showNew) {
            composed.body = `<div class="library-popup-new"><span class="library-new-pill">${i18n.t("gateway.study.library_new")}</span></div>${composed.body}`;
            options.showNew = false;
        }
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
                {
                    id: "previous",
                    label: i18n.t("gateway.study.library_previous"),
                    icon: {
                        light: "/static/assets/reuse/arrow-back-light.svg",
                        dark: "/static/assets/reuse/arrow-back-dark.svg",
                        position: "before",
                    },
                    variant: "neutral",
                    disabled: index <= 0,
                },
                {
                    id: "next",
                    label: i18n.t("gateway.study.library_next"),
                    icon: {
                        light: "/static/assets/reuse/arrow-back-light.svg",
                        dark: "/static/assets/reuse/arrow-back-dark.svg",
                        position: "after",
                        flip: true,
                    },
                    variant: "neutral",
                    disabled: index < 0 || index >= active.length - 1,
                },
                ...composed.actions,
            ],
            onOpen: (overlay, dismiss) => {
                dismissPopup = dismiss;
                overlay.classList.add("library-entry-popup");
                if (hasReadingDetails(titleDetailItems))
                    overlay.classList.add("library-entry-popup--composite");
                placeAudioSpeaker(overlay, audioController.signal);
                void loadLibraryAudio(
                    overlay,
                    audioObjectUrls,
                    audioController.signal,
                    i18n.t("gateway.study.library_audio_load_error"),
                );
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
                    openDrawing(
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
        audioController.abort();
        for (const objectUrl of audioObjectUrls) {
            URL.revokeObjectURL(objectUrl);
        }
        signal?.removeEventListener("abort", abortPopup);
        if (chosenTransformation !== undefined) {
            selectedTransformation = chosenTransformation;
            selectedEntry = detail.entry;
            sourceDefinition = "";
            continue;
        }
        if (result === "edit" && editMode) {
            await openLibraryEntryEditor({
                entry: detail.entry,
                entries,
                schemas,
                i18n,
                requestUpdate: editMode === "request",
                onSaved: handleSaved,
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
