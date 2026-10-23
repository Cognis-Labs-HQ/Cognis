import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { formatTemplate } from "/static/reuse/format-template.js";
import {
    loadUiPreferences,
    saveUiPreferences,
} from "/static/reuse/ui-preferences.js";
import { showToast } from "/static/reuse/toast.js";
import { runDeckAction } from "../app/actions.js";

export async function createPracticeModePreference({
    i18n,
    templates,
    signal,
    mode,
    isActive,
    onChange,
    writingAvailable = true,
}) {
    const preferences = await runDeckAction("load", loadUiPreferences, signal);
    let selected =
        mode ??
        (preferences?.studyPracticeMode === "writing" ? "writing" : "reading");
    let mountedSlot;
    const value = () => (writingAvailable ? selected : "reading");
    const updateAvailability = () => {
        if (!mountedSlot) return;
        mountedSlot.hidden = !writingAvailable;
        const select = mountedSlot.querySelector(
            "[data-practice-mode-preference]",
        );
        select.value = value();
        const writing = select.querySelector?.('option[value="writing"]');
        if (writing) {
            writing.hidden = !writingAvailable;
            writing.disabled = !writingAvailable;
        }
    };
    return {
        setWritingAvailable(available) {
            writingAvailable = available;
            updateAvailability();
        },
        get value() {
            return value();
        },
        id: "study-practice-mode",
        label: i18n.t("adapter.study.flashcards.practice_choose_mode"),
        render: () =>
            formatTemplate(templates.mode, {
                label: escapeHtml(
                    i18n.t("adapter.study.flashcards.practice_choose_mode"),
                ),
                reading: escapeHtml(
                    i18n.t("adapter.study.flashcards.practice_reading"),
                ),
                writing: escapeHtml(
                    i18n.t("adapter.study.flashcards.practice_writing"),
                ),
            }),
        mount(slot) {
            mountedSlot = slot;
            updateAvailability();
            const select = slot.querySelector(
                "[data-practice-mode-preference]",
            );
            select.value = value();
            select.addEventListener(
                "change",
                async () => {
                    const next = select.value;
                    select.value = value();
                    if (
                        !writingAvailable ||
                        next === selected ||
                        !["reading", "writing"].includes(next)
                    )
                        return;
                    select.disabled = true;
                    let dismissConfirmation;
                    const abortConfirmation = () => {
                        void dismissConfirmation?.();
                    };
                    signal.addEventListener("abort", abortConfirmation, {
                        once: true,
                    });
                    try {
                        await runDeckAction(
                            "practiceMode",
                            async () => {
                                if (isActive()) {
                                    const decision = await openPopup({
                                        title: i18n.t(
                                            "ui.reuse.unsaved_changes",
                                        ),
                                        body: escapeHtml(
                                            i18n.t(
                                                "adapter.study.flashcards.practice_restart_warning",
                                            ),
                                        ),
                                        variant: "warning",
                                        onOpen: (_overlay, dismiss) => {
                                            dismissConfirmation = dismiss;
                                            if (signal.aborted)
                                                abortConfirmation();
                                        },
                                        actions: [
                                            {
                                                id: "cancel",
                                                label: i18n.t(
                                                    "ui.reuse.cancel",
                                                ),
                                                variant: "neutral",
                                            },
                                            {
                                                id: "discard",
                                                label: i18n.t(
                                                    "ui.reuse.discard",
                                                ),
                                                variant: "cancel",
                                            },
                                        ],
                                    });
                                    if (
                                        decision !== "discard" ||
                                        signal.aborted
                                    )
                                        return;
                                }
                                await saveUiPreferences({
                                    studyPracticeMode: next,
                                });
                                if (signal.aborted) return;
                                selected = next;
                                select.value = value();
                                await onChange(selected);
                            },
                            signal,
                        );
                    } catch {
                        showToast(
                            i18n.t("adapter.study.flashcards.deck_save_error"),
                            { variant: "error" },
                        );
                    } finally {
                        signal.removeEventListener("abort", abortConfirmation);
                        select.disabled = false;
                    }
                },
                { signal },
            );
        },
    };
}
