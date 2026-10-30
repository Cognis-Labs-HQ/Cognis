/**
 * Decorative action icons retain their caller-supplied labels when unavailable.
 * @returns {void}
 */
export function bindPopupActionIcons(overlay) {
    for (const image of overlay.querySelectorAll(
        ".popup-header-action-icon img",
    )) {
        image.addEventListener(
            "error",
            () => {
                const button = image.closest(".popup-header-action");
                if (!button) return;
                button.textContent = button.getAttribute("aria-label");
                button.classList.add("popup-header-action--text");
                console.info("[popup] action icon unavailable", {
                    operation: "renderActionIcon",
                });
            },
            { once: true },
        );
    }
}

/** Owner-controlled heading accessories and reversible visual/accessibility concealment. */
export function createPopupContentApi(overlay, refitHeading) {
    const concealedState = new WeakMap();
    return {
        appendHeadingAccessory(element) {
            const heading = overlay.querySelector(".popup-heading");
            if (!heading || !element?.classList)
                throw new TypeError("popup_heading_accessory_unavailable");
            element.classList.add("popup-heading-accessory");
            heading.append(element);
            refitHeading();
        },
        setContentConcealed(concealed) {
            for (const element of overlay.querySelectorAll(
                ".popup-heading, .popup-body",
            )) {
                if (concealed) {
                    if (!concealedState.has(element)) {
                        concealedState.set(element, {
                            inert: element.inert,
                            ariaHidden: element.getAttribute("aria-hidden"),
                        });
                    }
                    element.inert = true;
                    element.setAttribute("aria-hidden", "true");
                    element.classList.add("popup-content--concealed");
                } else if (concealedState.has(element)) {
                    const previous = concealedState.get(element);
                    element.inert = previous.inert;
                    if (previous.ariaHidden === null)
                        element.removeAttribute("aria-hidden");
                    else
                        element.setAttribute(
                            "aria-hidden",
                            previous.ariaHidden,
                        );
                    element.classList.remove("popup-content--concealed");
                    concealedState.delete(element);
                }
            }
        },
    };
}
