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
import { variantPlacement } from "./variant-placement.js";

export async function openEntryPopup(
    root,
    initialEntry,
    schemas,
    entries,
    i18n,
    languageCode,
    signal,
) {
    if (isMeaningLayer(layerForEntry(schemas, initialEntry))) return;
    let selectedEntry = initialEntry;
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
        const active = entries.filter(
            (entry) =>
                entry.schemaId === selectedEntry.schemaId &&
                entry.layer === selectedEntry.layer,
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
        );
        signal?.throwIfAborted();
        const titleDetailItems = popupTitleDetailItems(
            detail,
            schemas,
            composed.titleDefinition,
        );
        if (parentEntry) {
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
        if (result?.startsWith("open-title-reference:")) {
            const entryId = result.slice("open-title-reference:".length);
            selectedEntry = entries.find((entry) => entry.id === entryId);
        } else if (result === "previous") selectedEntry = active[index - 1];
        else if (result === "next") selectedEntry = active[index + 1];
        else if (
            relatedEntry &&
            !isMeaningLayer(layerForEntry(schemas, relatedEntry))
        )
            selectedEntry = relatedEntry;
        else selectedEntry = null;
    }
}
