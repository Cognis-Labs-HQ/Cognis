import { bindDrawingPreview, placeAudioSpeaker } from "./drawing.js";
import { loadLibraryAudio } from "./presentation.js";
import { pronunciationClass } from "/static/gateways/study/reuse/pronunciation.js";

export function bindDetailLayout(root, signal) {
    if (signal?.aborted) return;
    if (root.querySelector('[data-popup-title-placement="reading"]'))
        root.classList.add("library-entry-popup--composite");
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
        '[data-popup-title-placement="reading"], [data-library-transform-pronunciation]',
    )) {
        const className = pronunciationClass(reading.textContent);
        if (className) reading.classList.add(className);
    }
}

export function bindEntryDetail(
    root,
    entry,
    { signal, audioObjectUrls, audioError },
) {
    bindDetailLayout(root, signal);
    bindDrawingPreview(root, entry, signal);
    placeAudioSpeaker(root, signal);
    void loadLibraryAudio(root, audioObjectUrls, signal, audioError);
}
