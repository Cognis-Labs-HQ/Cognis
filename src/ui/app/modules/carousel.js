export function revealLoadedModulePictures(root) {
    if (!root) return;
    root.querySelectorAll(".module-picture").forEach((picture) => {
        if (picture.complete && picture.naturalWidth > 0) {
            picture.classList.add("is-loaded");
        }
    });
}

export function updateScreenshotCarousel(carousel, indexes, step = 0) {
    const screenshots = [
        ...carousel.querySelectorAll(".module-detail-screenshot"),
    ];
    if (!screenshots.length) return;
    const moduleUuid = carousel.dataset.screenshotCarousel;
    const current = indexes.get(moduleUuid) ?? 0;
    const next = (current + step + screenshots.length) % screenshots.length;
    indexes.set(moduleUuid, next);
    screenshots.forEach((screenshot, index) => {
        const offset = (index - next + screenshots.length) % screenshots.length;
        screenshot.classList.toggle("is-active", offset === 0);
        screenshot.classList.toggle("is-next", offset === 1);
        screenshot.classList.toggle(
            "is-previous",
            offset === screenshots.length - 1,
        );
        screenshot.setAttribute("aria-hidden", String(offset !== 0));
    });
    carousel.classList.toggle("is-single", screenshots.length === 1);
}

export function initializeScreenshotCarousels(root, signal, indexes) {
    const refresh = () =>
        root
            .querySelectorAll("[data-screenshot-carousel]")
            .forEach((carousel) => updateScreenshotCarousel(carousel, indexes));
    refresh();
    const rotation = window.setInterval(() => {
        root.querySelectorAll(
            "[data-screenshot-carousel]:not(.is-single)",
        ).forEach((carousel) => updateScreenshotCarousel(carousel, indexes, 1));
    }, 5000);
    signal?.addEventListener("abort", () => window.clearInterval(rotation), {
        once: true,
    });
    return refresh;
}
