import { isOffline } from "/static/reuse/offline-state.js";
import { loadReferenceImages } from "./reference-images.js";
import { bindDrawingPreview, placeAudioSpeaker } from "./drawing.js";
import { loadLibraryAudio } from "./presentation.js";
import { pronunciationClass } from "/static/gateways/study/reuse/pronunciation.js";

export function bindDetailLayout(root, signal) {
    if (signal?.aborted) return;
    const groups = [...root.querySelectorAll(".library-related-entries")];
    const widths = new WeakMap();
    const update = (group) => {
        group.classList.remove("library-related-entries--scrolling");
        const rows = new Set(
            [...group.children].map((child) => child.offsetTop),
        );
        group.classList.toggle(
            "library-related-entries--scrolling",
            rows.size > 5,
        );
    };
    for (const group of groups) update(group);
    const observer = new ResizeObserver((entries) => {
        if (signal?.aborted) return;
        for (const { target, contentRect } of entries) {
            if (widths.get(target) === contentRect.width) continue;
            widths.set(target, contentRect.width);
            update(target);
        }
    });
    for (const group of groups) observer.observe(group);
    signal?.addEventListener("abort", () => observer.disconnect(), {
        once: true,
    });
    for (const reading of root.querySelectorAll(
        '[data-popup-title-placement="aside"], [data-library-transform-pronunciation]',
    )) {
        const className = pronunciationClass(reading.textContent);
        if (className) reading.classList.add(className);
    }
}

export function bindEntryDetail(
    root,
    entry,
    { signal, audioObjectUrls, audioError, imageError, requestId, popupApi },
) {
    bindDetailLayout(root, signal);
    bindDrawingPreview(popupApi, entry, signal);
    placeAudioSpeaker(root, signal, popupApi);
    window.addEventListener(
        "cognis:connectivity-changed",
        () => {
            if (!isOffline()) return;
            for (const audio of root.querySelectorAll("audio")) audio.pause();
            for (const button of root.querySelectorAll(
                "[data-library-audio-sequence-toggle], [data-library-audio-toggle], [data-library-refresh-audio]",
            ))
                button.disabled = true;
        },
        { signal },
    );
    if (isOffline()) return;
    void loadLibraryAudio(root, audioObjectUrls, signal, audioError);
    void loadReferenceImages(root, {
        signal,
        objectUrls: audioObjectUrls,
        errorMessage: imageError,
        requestId,
    });
}

export function releaseEntryMedia(controller, objectUrls, signal, abortPopup) {
    controller.abort();
    for (const objectUrl of objectUrls) URL.revokeObjectURL(objectUrl);
    objectUrls.clear();
    signal?.removeEventListener("abort", abortPopup);
}
