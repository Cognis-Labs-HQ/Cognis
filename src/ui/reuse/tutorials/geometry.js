/**
 * Computes visible tutorial geometry without changing targets or scrolling their owners.
 * Public exports: clipRect — intersects rectangles; tutorialViewport — excludes shell chrome;
 * visibleTargetRect — clips a padded target to its scrolling ancestors and viewport;
 * shadeRegions — subtracts highlight and control rectangles from the page shade.
 * @example const visible = visibleTargetRect(target, tutorialViewport(window, document, target), 8);
 */

/** @param {object} rect Source rectangle. @param {object} bounds Clip rectangle. @returns {object|null} Visible intersection. */
export function clipRect(rect, bounds) {
    const left = Math.max(rect.left, bounds.left);
    const top = Math.max(rect.top, bounds.top);
    const right = Math.min(rect.right, bounds.right);
    const bottom = Math.min(rect.bottom, bounds.bottom);
    return right > left && bottom > top
        ? {
              left,
              top,
              right,
              bottom,
              width: right - left,
              height: bottom - top,
          }
        : null;
}

/** @param {Window} window Browser window. @param {Document} document Owner document. @param {Element} target Tutorial target. @returns {object} Visible page viewport. */
export function tutorialViewport(window, document, target) {
    const visual = window.visualViewport;
    const left = visual?.offsetLeft ?? 0;
    let top = visual?.offsetTop ?? 0;
    const width = visual?.width ?? window.innerWidth;
    let bottom = top + (visual?.height ?? window.innerHeight);
    const header = document.querySelector(".site-header");
    const footer = document.querySelector(".global-footer");
    for (const [element, edge] of [
        [header, "top"],
        [document.querySelector("#site-top-banners"), "top"],
        [footer, "bottom"],
    ]) {
        if (!element || element.contains(target) || target?.contains(element))
            continue;
        const rect = element.getBoundingClientRect();
        if (
            rect.width <= 0 ||
            rect.height <= 0 ||
            rect.right <= left ||
            rect.left >= left + width
        )
            continue;
        if (edge === "top" && rect.bottom > top && rect.bottom < bottom)
            top = rect.bottom;
        if (
            edge === "bottom" &&
            rect.top > top &&
            rect.top < bottom &&
            rect.bottom > rect.top
        )
            bottom = rect.top;
    }
    return {
        offsetLeft: left,
        offsetTop: top,
        width,
        height: Math.max(0, bottom - top),
    };
}

/** @param {Element} target Tutorial target. @param {object} viewport Visible page viewport. @param {number} padding Target padding. @returns {object|null} Visible padded target. */
export function visibleTargetRect(target, viewport, padding = 0) {
    const rect = target.getBoundingClientRect();
    let visible = clipRect(
        {
            left: rect.left - padding,
            top: rect.top - padding,
            right: rect.right + padding,
            bottom: rect.bottom + padding,
        },
        {
            left: viewport.offsetLeft + 8,
            top: viewport.offsetTop + 8,
            right: viewport.offsetLeft + viewport.width - 8,
            bottom: viewport.offsetTop + viewport.height - 8,
        },
    );
    let parent = target.parentElement ?? target.getRootNode?.().host;
    while (parent && visible) {
        const style = target.ownerDocument.defaultView.getComputedStyle(parent);
        const bounds = parent.getBoundingClientRect();
        const clips = (overflow) =>
            /^(auto|scroll|hidden|clip)$/.test(overflow);
        const left = bounds.left + parent.clientLeft;
        const top = bounds.top + parent.clientTop;
        visible = clipRect(visible, {
            left: clips(style.overflowX) ? left : visible.left,
            right: clips(style.overflowX)
                ? left + parent.clientWidth
                : visible.right,
            top: clips(style.overflowY) ? top : visible.top,
            bottom: clips(style.overflowY)
                ? top + parent.clientHeight
                : visible.bottom,
        });
        parent = parent.parentElement ?? parent.getRootNode?.().host;
    }
    return visible;
}

/** @param {object} bounds Page bounds. @param {object[]} exclusions Unshaded rectangles. @returns {object[]} Non-overlapping shaded rectangles. */
export function shadeRegions(bounds, exclusions) {
    let regions = [bounds];
    for (const exclusion of exclusions) {
        regions = regions.flatMap((region) => {
            const overlap = clipRect(region, exclusion);
            if (!overlap) return [region];
            return [
                { ...region, bottom: overlap.top },
                { ...region, top: overlap.bottom },
                {
                    left: region.left,
                    right: overlap.left,
                    top: overlap.top,
                    bottom: overlap.bottom,
                },
                {
                    left: overlap.right,
                    right: region.right,
                    top: overlap.top,
                    bottom: overlap.bottom,
                },
            ].filter(
                (part) => part.right > part.left && part.bottom > part.top,
            );
        });
    }
    return regions;
}
