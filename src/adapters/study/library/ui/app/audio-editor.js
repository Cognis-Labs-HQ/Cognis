import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { reportClientError } from "/static/reuse/error-reporting.js";
import { fetchLibraryAudioUrl } from "/static/gateways/study/library-client.js";
import { renderAudio, loadLibraryAudio } from "./presentation.js";

export function renderAudioEditor(entry, layer, field, i18n) {
    if (field.type !== "audio") return "";
    const refresh =
        entry.canRegenerateAudio === true && entry.scope === "global"
            ? `<button type="button" class="btn-neutral" data-library-refresh-audio="${escapeHtml(field.id)}" aria-label="${escapeHtml(i18n.t("gateway.study.library_audio_refresh"))}"><img class="library-speaker-icon library-speaker-icon-light" src="/static/assets/reuse/refresh-light.svg" alt=""><img class="library-speaker-icon library-speaker-icon-dark" src="/static/assets/reuse/refresh-dark.svg" alt=""></button>`
            : "";
    return `<div data-library-editor-audio>${renderAudio(entry, { ...layer, fields: [field] }, [], [], "", "", true)}${refresh}</div>`;
}

export function bindAudioEditor(form, entry, i18n, signal) {
    if (!signal) return;
    const objectUrls = new Set();
    const staged = new Map();
    form.addEventListener(
        "change",
        () => {
            for (const field of form.querySelectorAll(
                "[data-library-audio-upload]",
            )) {
                const stored = field.querySelector('input[type="hidden"]');
                const file = stored.libraryStagedAudio;
                if (!file || staged.get(field) === file) continue;
                const audio = field.querySelector("audio");
                if (!audio) continue;
                staged.set(field, file);
                if (audio.src) {
                    URL.revokeObjectURL(audio.src);
                    objectUrls.delete(audio.src);
                }
                audio.pause();
                audio.src = URL.createObjectURL(file);
                objectUrls.add(audio.src);
                field.querySelector(
                    "[data-library-audio-sequence-toggle]",
                ).disabled = false;
            }
        },
        { signal },
    );
    void loadLibraryAudio(
        form,
        objectUrls,
        signal,
        i18n.t("gateway.study.library_audio_upload_error"),
    );
    signal.addEventListener(
        "abort",
        () => {
            for (const audio of form.querySelectorAll("audio")) audio.pause();
            for (const url of objectUrls) URL.revokeObjectURL(url);
        },
        { once: true },
    );
    if (form.classList.contains("library-admin-editor--read-only"))
        form.querySelectorAll("[data-library-refresh-audio]").forEach(
            (button) => button.remove(),
        );
    for (const button of form.querySelectorAll(
        "[data-library-refresh-audio]",
    )) {
        button.addEventListener(
            "click",
            async () => {
                button.disabled = true;
                const stored = form.elements.namedItem(
                    `field:${button.dataset.libraryRefreshAudio}`,
                );
                const previousFile = stored?.libraryStagedAudio;
                try {
                    const url = await fetchLibraryAudioUrl(
                        entry.id,
                        button.dataset.libraryRefreshAudio,
                        { signal, refresh: true },
                    );
                    const audio = button
                        .closest("[data-library-editor-audio]")
                        .querySelector("audio");
                    if (
                        !audio ||
                        !audio.isConnected ||
                        signal.aborted ||
                        stored?.libraryStagedAudio !== previousFile
                    ) {
                        URL.revokeObjectURL(url);
                        return;
                    }
                    if (audio.src) {
                        URL.revokeObjectURL(audio.src);
                        objectUrls.delete(audio.src);
                    }
                    objectUrls.add(url);
                    audio.pause();
                    audio.src = url;
                    if (stored) {
                        stored.value = "";
                        delete stored.libraryStagedAudio;
                    }
                    button
                        .closest("[data-library-editor-audio]")
                        .querySelector(
                            "[data-library-audio-sequence-toggle]",
                        ).disabled = false;
                    showToast(i18n.t("gateway.study.library_audio_refreshed"), {
                        variant: "success",
                    });
                } catch (error) {
                    if (signal.aborted) return;
                    reportClientError({
                        component: "study-library",
                        operation: "refreshAudio",
                        entryId: entry.id,
                        errorName: error?.name,
                    });
                    showToast(
                        i18n.t("gateway.study.library_audio_upload_error"),
                        { variant: "error" },
                    );
                } finally {
                    button.disabled = false;
                }
            },
            { signal },
        );
    }
}
