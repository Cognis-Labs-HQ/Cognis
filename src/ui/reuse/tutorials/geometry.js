/**
 * Computes visible tutorial geometry without changing targets or scrolling their owners.
 * Public exports: clipRect — intersects rectangles; tutorialViewport — excludes shell chrome;
 * visibleTargetRect — clips a padded target to its scrolling ancestors and viewport;
 * calloutViewport — reclaims header space for readable explanations on short screens;
 * shadeRegions — subtracts highlight and control rectangles from the page shade.
 * @example const visible = visibleTargetRect(target, tutorialViewport(window, document, target), 8);
 */

/** @param {object} rectangle Source rectangle. @param {object} bounds Clip rectangle. @returns {object|null} Visible intersection. */
function clipRectangle(rectangle, bounds) {
    const left = Math.max(rectangle.left, bounds.left);
    const top = Math.max(rectangle.top, bounds.top);
    const right = Math.min(rectangle.right, bounds.right);
    const bottom = Math.min(rectangle.bottom, bounds.bottom);
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
export { clipRectangle as clipRect };

/** @param {Window} window Browser window. @param {Document} document Owner document. @param {Element} target Tutorial target. @param {string} layer Target layer; overlays are not obscured by shell chrome. @returns {object} Visible page viewport. */
export function tutorialViewport(window, document, target, layer = "page") {
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
        if (layer === "overlay" && (element === header || element === footer))
            continue;
        if (!element || element.contains(target) || target?.contains(element))
            continue;
        const rectangle = element.getBoundingClientRect();
        if (
            rectangle.width <= 0 ||
            rectangle.height <= 0 ||
            rectangle.right <= left ||
            rectangle.left >= left + width
        )
            continue;
        if (
            edge === "top" &&
            rectangle.bottom > top &&
            rectangle.bottom < bottom
        )
            top = rectangle.bottom;
        if (
            edge === "bottom" &&
            rectangle.top > top &&
            rectangle.top < bottom &&
            rectangle.bottom > rectangle.top
        )
            bottom = rectangle.top;
    }
    return {
        offsetLeft: left,
        offsetTop: top,
        width,
        height: Math.max(0, bottom - top),
    };
}

/**
 * Keeps the footer boundary while allowing short-screen explanations above the header.
 * @param {object} viewport Page area after shell exclusion.
 * @param {Window} window Owner window with visual viewport offsets.
 * @returns {object} Available explanation and action area.
 */
export function calloutViewport(viewport, window) {
    if (viewport.height >= 240) return viewport;
    const top = window.visualViewport?.offsetTop ?? 0;
    return {
        ...viewport,
        offsetTop: top,
        height: viewport.offsetTop + viewport.height - top,
    };
}

/** @param {Element} target Tutorial target. @param {object} viewport Visible page viewport. @param {number} padding Target padding. @returns {object|null} Visible padded target. */
function visibleTargetRectangle(target, viewport, padding = 0) {
    const rectangle = target.getBoundingClientRect();
    const window = target.ownerDocument.defaultView;
    const visual = window.visualViewport;
    const bottom = target.closest?.("[data-page-action-dock]")
        ? (visual?.offsetTop ?? 0) + (visual?.height ?? window.innerHeight)
        : viewport.offsetTop + viewport.height;
    let visible = clipRectangle(
        {
            left: rectangle.left - padding,
            top: rectangle.top - padding,
            right: rectangle.right + padding,
            bottom: rectangle.bottom + padding,
        },
        {
            left: viewport.offsetLeft + 8,
            top: viewport.offsetTop + 8,
            right: viewport.offsetLeft + viewport.width - 8,
            bottom: bottom - 8,
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
        visible = clipRectangle(visible, {
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
export { visibleTargetRectangle as visibleTargetRect };

/** @param {object} bounds Page bounds. @param {object[]} exclusions Unshaded rectangles. @returns {object[]} Non-overlapping shaded rectangles. */
export function shadeRegions(bounds, exclusions) {
    let regions = [bounds];
    for (const exclusion of exclusions) {
        regions = regions.flatMap((region) => {
            const overlap = clipRectangle(region, exclusion);
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
