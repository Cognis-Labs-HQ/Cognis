/** @param {HTMLElement} root Study page root. @param {AbortSignal} signal Navigation lifetime. @returns {void} */
export function mountLanguageLabels(root, signal) {
    const list = root.querySelector(".study-subnav-language-options");
    if (!list || signal.aborted) return;
    const window = list.ownerDocument.defaultView;
    const previousMode = list.getAttribute("data-language-display");
    const previousWidth = list.style.getPropertyValue("--study-language-width");
    const widthOfItems = () => {
        const gap =
            Number.parseFloat(window.getComputedStyle(list).columnGap) || 0;
        return (
            [...list.children].reduce(
                (total, item) => total + item.getBoundingClientRect().width,
                0,
            ) +
            Math.max(0, list.children.length - 1) * gap
        );
    };
    const synchronize = () => {
        if (signal.aborted || !list.isConnected || !list.clientWidth) return;
        list.dataset.languageDisplay = "name";
        const fullWidth = widthOfItems();
        const desiredWidth = `${Math.ceil(fullWidth)}px`;
        if (
            list.style.getPropertyValue("--study-language-width") !==
            desiredWidth
        )
            list.style.setProperty("--study-language-width", desiredWidth);
        for (const mode of ["name", "code", "flag"]) {
            list.dataset.languageDisplay = mode;
            if (widthOfItems() <= list.clientWidth + 1) break;
        }
    };
    const observer = new window.ResizeObserver(synchronize);
    observer.observe(list);
    for (const item of list.querySelectorAll("[data-language-code]"))
        observer.observe(item);
    signal.addEventListener(
        "abort",
        () => {
            observer.disconnect();
            if (previousMode === null)
                list.removeAttribute("data-language-display");
            else list.setAttribute("data-language-display", previousMode);
            if (previousWidth)
                list.style.setProperty("--study-language-width", previousWidth);
            else list.style.removeProperty("--study-language-width");
        },
        { once: true },
    );
    list.ownerDocument.fonts.ready.then(synchronize);
    synchronize();
}
