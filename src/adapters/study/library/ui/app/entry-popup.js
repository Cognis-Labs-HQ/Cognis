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
import { popupTitleDetailItems } from "./popup-title.js";
import { resolvePopupNavigation } from "./popup-navigation.js";
import { titleDefinitionForRole } from "./title-definition.js";
import {
    assignVariantPlacements,
    variantPlacement,
} from "./variant-placement.js";
import { isDirectlyVisible } from "./cards.js";
import { openLibraryEntryEditor } from "./admin-interactions.js";
import { entryEditMode } from "./editability.js";
import {
    canDraw,
    drawingHeaderActions,
    drawingPattern,
    openDrawing,
    placeAudioSpeaker,
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
    while (selectedEntry && !signal?.aborted) {
        const detail = await fetchLibraryEntry(selectedEntry.id);
        const explicitTitleReferences = headingCompositionReferences(
            detail,
            schemas,
        );
        const titleReferences = explicitTitleReferences.length
            ? explicitTitleReferences
            : resolveLabelComposition(
                  detail.entry.label,
                  detail.entry,
                  schemas,
                  entries,
              );
        const parentEntry = entries.find(
            (entry) =>
                entry.id ===
                variantPlacement(detail.entry, schemas, entries)?.parentId,
        );
        const layer = layerForEntry(schemas, selectedEntry);
        const editMode = options.readOnly ? null : entryEditMode(selectedEntry);
        if (options.startEditing && editMode) {
            options.startEditing = false;
            await openLibraryEntryEditor({
                entry: detail.entry,
                entries,
                schemas,
                i18n,
                requestUpdate: editMode === "request",
                onSaved: () => {
                    if (editMode === "direct")
                        Object.assign(selectedEntry, detail.entry);
                },
            });
            continue;
        }
        const layerEntries = entries.filter(
            (entry) =>
                entry.schemaId === selectedEntry.schemaId &&
                entry.layer === selectedEntry.layer,
        );
        const schema = schemas.find(
            (candidate) => candidate.id === selectedEntry.schemaId,
        );
        const placements = assignVariantPlacements(layerEntries, schema, layer);
        const active = layerEntries.filter(
            (entry) =>
                !placements.has(entry.id) &&
                isDirectlyVisible(entry, layerEntries, placements),
        );
        const index = active.findIndex(
            (entry) => entry.id === selectedEntry.id,
        );
        const composed = await composeDetail(
            detail,
            schemas,
            entries,
            i18n,
            languageCode,
            options,
        );
        if (options.showNew) {
            composed.body = `<div class="library-popup-new"><span class="library-new-pill">${i18n.t("gateway.study.library_new")}</span></div>${composed.body}`;
            options.showNew = false;
        }
        signal?.throwIfAborted();
        const titleDetailItems = popupTitleDetailItems(
            detail,
            schemas,
            composed.titleDefinition,
            sourceDefinition,
            titleReferences,
        );
        const displayedDefinition = titleDefinitionForRole(
            layer?.semanticRole,
            composed.titleDefinition,
            sourceDefinition,
        );
        const strokePattern = drawingPattern(detail.entry, layer);
        const drawingAvailable = canDraw(strokePattern);
        if (parentEntry && layer?.semanticRole !== "lexicalUnit") {
            const [parentPrefix, parentSuffix = ""] = i18n
                .t("gateway.study.library_from_parent")
                .split("{{ parent }}");
            titleDetailItems.push(
                ...(titleDetailItems.length ? [{ label: " · " }] : []),
                { label: parentPrefix },
                {
                    label: parentEntry.label,
                    actionId: `open-title-reference:${parentEntry.id}`,
                },
                { label: parentSuffix },
            );
        }
        let dismissPopup;
        let relatedEntry;
        const audioObjectUrls = new Set();
        const audioController = new AbortController();
        const abortPopup = () => dismissPopup?.();
        signal?.addEventListener("abort", abortPopup, { once: true });
        const result = await openPopup({
            title: detail.entry.label,
            titleLeading: composed.titleLeading,
            titleItems: titleReferences.map((entry) => ({
                label: entry.label,
                actionId: `open-title-reference:${entry.id}`,
            })),
            titleDetailItems,
            headerActions: [
                ...drawingHeaderActions(strokePattern, i18n),
                ...(editMode
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
                if (detail.entry.class === "composite")
                    overlay.classList.add("library-entry-popup--composite");
                placeAudioSpeaker(overlay);
                void loadLibraryAudio(
                    overlay,
                    audioObjectUrls,
                    audioController.signal,
                    i18n.t("gateway.study.library_audio_load_error"),
                );
                overlay.addEventListener("click", (event) => {
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
                if (actionId === "draw" && drawingAvailable) {
                    openDrawing(detail.entry, strokePattern);
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
        if (result === "edit" && editMode) {
            await openLibraryEntryEditor({
                entry: detail.entry,
                entries,
                schemas,
                i18n,
                requestUpdate: editMode === "request",
                onSaved: () => {
                    if (editMode === "direct")
                        Object.assign(selectedEntry, detail.entry);
                },
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
    }
}
