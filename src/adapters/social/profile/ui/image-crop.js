/**
 * Clamps an image drag offset so the crop frame remains fully covered.
 *
 * @param {number} offset
 * @param {number} maxOffset
 * @returns {number}
 */
export function clampCropOffset(offset, maxOffset) {
    const safeOffset = Number.isFinite(offset) ? offset : 0;
    const safeMaxOffset = Math.max(
        0,
        Number.isFinite(maxOffset) ? maxOffset : 0,
    );
    return Math.min(safeMaxOffset, Math.max(-safeMaxOffset, safeOffset));
}

/**
 * Computes the scaled image geometry and clamped drag offsets for a crop frame.
 *
 * @param {{
 *   imageWidth: number,
 *   imageHeight: number,
 *   frameWidth: number,
 *   frameHeight: number,
 *   zoom?: number,
 *   offsetX?: number,
 *   offsetY?: number,
 * }} params
 * @returns {{
 *   frameWidth: number,
 *   frameHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   fitScale: number,
 *   zoom: number,
 *   renderedWidth: number,
 *   renderedHeight: number,
 *   maxOffsetX: number,
 *   maxOffsetY: number,
 *   offsetX: number,
 *   offsetY: number,
 * }}
 */
export function computeCropViewport({
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    zoom = 1,
    offsetX = 0,
    offsetY = 0,
}) {
    const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
    const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
    const safeFrameWidth = Math.max(1, Number(frameWidth) || 1);
    const safeFrameHeight = Math.max(1, Number(frameHeight) || 1);
    const safeZoom = Math.max(1, Number(zoom) || 1);

    const fitScale = Math.max(
        safeFrameWidth / safeImageWidth,
        safeFrameHeight / safeImageHeight,
    );
    const renderedWidth = safeImageWidth * fitScale * safeZoom;
    const renderedHeight = safeImageHeight * fitScale * safeZoom;
    const maxOffsetX = Math.max(0, (renderedWidth - safeFrameWidth) / 2);
    const maxOffsetY = Math.max(0, (renderedHeight - safeFrameHeight) / 2);
    const clampedOffsetX = clampCropOffset(offsetX, maxOffsetX);
    const clampedOffsetY = clampCropOffset(offsetY, maxOffsetY);

    return {
        frameWidth: safeFrameWidth,
        frameHeight: safeFrameHeight,
        imageWidth: safeImageWidth,
        imageHeight: safeImageHeight,
        fitScale,
        zoom: safeZoom,
        renderedWidth,
        renderedHeight,
        maxOffsetX,
        maxOffsetY,
        offsetX: clampedOffsetX,
        offsetY: clampedOffsetY,
    };
}

/**
 * Converts a rendered crop viewport into a source rectangle in image pixels.
 *
 * @param {{
 *   frameWidth: number,
 *   frameHeight: number,
 *   renderedWidth: number,
 *   renderedHeight: number,
 *   imageWidth: number,
 *   imageHeight: number,
 *   offsetX: number,
 *   offsetY: number,
 * }} viewport
 * @returns {{
 *   sourceX: number,
 *   sourceY: number,
 *   sourceWidth: number,
 *   sourceHeight: number,
 * }}
 */
export function computeCropSourceRect(viewport) {
    const baseLeft = (viewport.frameWidth - viewport.renderedWidth) / 2;
    const baseTop = (viewport.frameHeight - viewport.renderedHeight) / 2;
    const renderedLeft = baseLeft + viewport.offsetX;
    const renderedTop = baseTop + viewport.offsetY;

    const sourceX =
        ((0 - renderedLeft) / viewport.renderedWidth) * viewport.imageWidth;
    const sourceY =
        ((0 - renderedTop) / viewport.renderedHeight) * viewport.imageHeight;
    const sourceWidth =
        (viewport.frameWidth / viewport.renderedWidth) * viewport.imageWidth;
    const sourceHeight =
        (viewport.frameHeight / viewport.renderedHeight) * viewport.imageHeight;

    return {
        sourceX: Math.max(0, sourceX),
        sourceY: Math.max(0, sourceY),
        sourceWidth: Math.min(viewport.imageWidth, sourceWidth),
        sourceHeight: Math.min(viewport.imageHeight, sourceHeight),
    };
}

/**
 * Returns output image dimensions derived from the target crop aspect ratio.
 *
 * @param {number} aspectRatio Width-to-height ratio (width / height)
 * @param {number} [targetWidth=1600]
 * @returns {{ width: number, height: number }}
 */
export function getCropOutputDimensions(aspectRatio, targetWidth = 1600) {
    const safeAspectRatio = Math.max(0.25, Number(aspectRatio) || 1);
    const safeTargetWidth = Math.max(256, Number(targetWidth) || 1600);
    return {
        width: safeTargetWidth,
        height: Math.max(256, Math.round(safeTargetWidth / safeAspectRatio)),
    };
}

/**
 * Computes the bounds of an image rendered with object-fit: contain.
 *
 * @param {{
 *   imageWidth: number,
 *   imageHeight: number,
 *   frameWidth: number,
 *   frameHeight: number,
 * }} params
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function computeContainImageBounds({
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
}) {
    const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
    const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
    const safeFrameWidth = Math.max(1, Number(frameWidth) || 1);
    const safeFrameHeight = Math.max(1, Number(frameHeight) || 1);
    const scale = Math.min(
        safeFrameWidth / safeImageWidth,
        safeFrameHeight / safeImageHeight,
    );
    const width = safeImageWidth * scale;
    const height = safeImageHeight * scale;
    return {
        left: (safeFrameWidth - width) / 2,
        top: (safeFrameHeight - height) / 2,
        width,
        height,
    };
}

/**
 * Creates a centered initial crop selection inside image bounds.
 *
 * @param {{
 *   bounds: { left: number, top: number, width: number, height: number },
 *   aspectRatio: number,
 *   minSize?: number,
 *   fillRatio?: number,
 * }} params
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function createInitialCropSelection({
    bounds,
    aspectRatio,
    minSize = 64,
    fillRatio = 1,
}) {
    const safeAspectRatio = Math.max(0.25, Number(aspectRatio) || 1);
    const safeMinSize = Math.max(16, Number(minSize) || 64);
    const safeFillRatio = Math.min(1, Math.max(0.2, Number(fillRatio) || 1));
    const maxWidth = Math.min(bounds.width, bounds.height * safeAspectRatio);
    const minWidth = Math.min(maxWidth, safeMinSize);
    const width = Math.min(
        maxWidth,
        Math.max(minWidth, maxWidth * safeFillRatio),
    );
    const height = width / safeAspectRatio;
    return {
        left: bounds.left + (bounds.width - width) / 2,
        top: bounds.top + (bounds.height - height) / 2,
        width,
        height,
    };
}

/**
 * Clamps a crop selection to image bounds while preserving aspect ratio.
 *
 * @param {{
 *   selection: { left: number, top: number, width: number, height: number },
 *   bounds: { left: number, top: number, width: number, height: number },
 *   aspectRatio: number,
 *   minSize?: number,
 * }} params
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function clampCropSelection({
    selection,
    bounds,
    aspectRatio,
    minSize = 64,
}) {
    const safeAspectRatio = Math.max(0.25, Number(aspectRatio) || 1);
    const safeMinSize = Math.max(16, Number(minSize) || 64);
    const maxWidth = Math.max(
        1,
        Math.min(bounds.width, bounds.height * safeAspectRatio),
    );
    const minWidth = Math.min(maxWidth, safeMinSize);
    const width = Math.min(
        maxWidth,
        Math.max(minWidth, Number(selection.width) || minWidth),
    );
    const height = width / safeAspectRatio;
    const minLeft = bounds.left;
    const maxLeft = bounds.left + bounds.width - width;
    const minTop = bounds.top;
    const maxTop = bounds.top + bounds.height - height;
    return {
        left: Math.min(
            maxLeft,
            Math.max(minLeft, Number(selection.left) || minLeft),
        ),
        top: Math.min(
            maxTop,
            Math.max(minTop, Number(selection.top) || minTop),
        ),
        width,
        height,
    };
}

/**
 * Moves a crop selection while keeping it inside bounds.
 *
 * @param {{
 *   startSelection: { left: number, top: number, width: number, height: number },
 *   deltaX: number,
 *   deltaY: number,
 *   bounds: { left: number, top: number, width: number, height: number },
 * }} params
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function computeMovedCropSelection({
    startSelection,
    deltaX,
    deltaY,
    bounds,
}) {
    const width = Math.max(1, Number(startSelection.width) || 1);
    const height = Math.max(1, Number(startSelection.height) || 1);
    const minLeft = bounds.left;
    const maxLeft = bounds.left + bounds.width - width;
    const minTop = bounds.top;
    const maxTop = bounds.top + bounds.height - height;
    return {
        left: Math.min(
            maxLeft,
            Math.max(minLeft, startSelection.left + (Number(deltaX) || 0)),
        ),
        top: Math.min(
            maxTop,
            Math.max(minTop, startSelection.top + (Number(deltaY) || 0)),
        ),
        width,
        height,
    };
}

function getFixedAnchorModes(handle) {
    const safeHandle = String(handle || "").toLowerCase();
    const fixedHorizontalAnchor = safeHandle.includes("e")
        ? "left"
        : safeHandle.includes("w")
          ? "right"
          : "center";
    const fixedVerticalAnchor = safeHandle.includes("s")
        ? "top"
        : safeHandle.includes("n")
          ? "bottom"
          : "center";
    return { fixedHorizontalAnchor, fixedVerticalAnchor };
}

/**
 * Resizes a crop selection from one of its handles while preserving aspect ratio.
 *
 * @param {{
 *   startSelection: { left: number, top: number, width: number, height: number },
 *   handle: string,
 *   deltaX: number,
 *   deltaY: number,
 *   bounds: { left: number, top: number, width: number, height: number },
 *   aspectRatio: number,
 *   minSize?: number,
 * }} params
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
export function computeResizedCropSelection({
    startSelection,
    handle,
    deltaX,
    deltaY,
    bounds,
    aspectRatio,
    minSize = 64,
}) {
    const safeAspectRatio = Math.max(0.25, Number(aspectRatio) || 1);
    const safeMinSize = Math.max(16, Number(minSize) || 64);
    const { fixedHorizontalAnchor, fixedVerticalAnchor } =
        getFixedAnchorModes(handle);
    const selectionCenterX = startSelection.left + startSelection.width / 2;
    const selectionCenterY = startSelection.top + startSelection.height / 2;
    const anchorX =
        fixedHorizontalAnchor === "left"
            ? startSelection.left
            : fixedHorizontalAnchor === "right"
              ? startSelection.left + startSelection.width
              : selectionCenterX;
    const anchorY =
        fixedVerticalAnchor === "top"
            ? startSelection.top
            : fixedVerticalAnchor === "bottom"
              ? startSelection.top + startSelection.height
              : selectionCenterY;

    let desiredWidth = startSelection.width;
    if (fixedHorizontalAnchor === "left") {
        desiredWidth = startSelection.width + (Number(deltaX) || 0);
    } else if (fixedHorizontalAnchor === "right") {
        desiredWidth = startSelection.width - (Number(deltaX) || 0);
    } else if (fixedVerticalAnchor === "top") {
        desiredWidth =
            (startSelection.height + (Number(deltaY) || 0)) * safeAspectRatio;
    } else if (fixedVerticalAnchor === "bottom") {
        desiredWidth =
            (startSelection.height - (Number(deltaY) || 0)) * safeAspectRatio;
    }

    if (
        fixedHorizontalAnchor !== "center" &&
        fixedVerticalAnchor !== "center"
    ) {
        const widthFromHorizontal =
            fixedHorizontalAnchor === "left"
                ? startSelection.width + (Number(deltaX) || 0)
                : startSelection.width - (Number(deltaX) || 0);
        const widthFromVertical =
            fixedVerticalAnchor === "top"
                ? (startSelection.height + (Number(deltaY) || 0)) *
                  safeAspectRatio
                : (startSelection.height - (Number(deltaY) || 0)) *
                  safeAspectRatio;
        desiredWidth =
            Math.abs(widthFromHorizontal - startSelection.width) >=
            Math.abs(widthFromVertical - startSelection.width)
                ? widthFromHorizontal
                : widthFromVertical;
    }

    const maxWidthHorizontal =
        fixedHorizontalAnchor === "left"
            ? bounds.left + bounds.width - anchorX
            : fixedHorizontalAnchor === "right"
              ? anchorX - bounds.left
              : Math.min(
                    anchorX - bounds.left,
                    bounds.left + bounds.width - anchorX,
                ) * 2;
    const maxHeightVertical =
        fixedVerticalAnchor === "top"
            ? bounds.top + bounds.height - anchorY
            : fixedVerticalAnchor === "bottom"
              ? anchorY - bounds.top
              : Math.min(
                    anchorY - bounds.top,
                    bounds.top + bounds.height - anchorY,
                ) * 2;
    const maxWidth = Math.max(
        safeMinSize,
        Math.min(maxWidthHorizontal, maxHeightVertical * safeAspectRatio),
    );
    const width = Math.min(maxWidth, Math.max(safeMinSize, desiredWidth));
    const height = width / safeAspectRatio;
    const left =
        fixedHorizontalAnchor === "left"
            ? anchorX
            : fixedHorizontalAnchor === "right"
              ? anchorX - width
              : anchorX - width / 2;
    const top =
        fixedVerticalAnchor === "top"
            ? anchorY
            : fixedVerticalAnchor === "bottom"
              ? anchorY - height
              : anchorY - height / 2;
    return clampCropSelection({
        selection: { left, top, width, height },
        bounds,
        aspectRatio: safeAspectRatio,
        minSize: safeMinSize,
    });
}

/**
 * Maps a crop selection to the original image source rectangle.
 *
 * @param {{
 *   selection: { left: number, top: number, width: number, height: number },
 *   imageBounds: { left: number, top: number, width: number, height: number },
 *   imageWidth: number,
 *   imageHeight: number,
 * }} params
 * @returns {{
 *   sourceX: number,
 *   sourceY: number,
 *   sourceWidth: number,
 *   sourceHeight: number,
 * }}
 */
export function computeCropSourceRectFromSelection({
    selection,
    imageBounds,
    imageWidth,
    imageHeight,
}) {
    const safeImageWidth = Math.max(1, Number(imageWidth) || 1);
    const safeImageHeight = Math.max(1, Number(imageHeight) || 1);
    const safeBoundsWidth = Math.max(1, Number(imageBounds.width) || 1);
    const safeBoundsHeight = Math.max(1, Number(imageBounds.height) || 1);
    const normalizedLeft =
        (selection.left - imageBounds.left) / safeBoundsWidth;
    const normalizedTop = (selection.top - imageBounds.top) / safeBoundsHeight;
    const normalizedWidth = selection.width / safeBoundsWidth;
    const normalizedHeight = selection.height / safeBoundsHeight;
    return {
        sourceX: Math.max(0, normalizedLeft * safeImageWidth),
        sourceY: Math.max(0, normalizedTop * safeImageHeight),
        sourceWidth: Math.min(safeImageWidth, normalizedWidth * safeImageWidth),
        sourceHeight: Math.min(
            safeImageHeight,
            normalizedHeight * safeImageHeight,
        ),
    };
}

/**
 * Composes a crop selection into an absolute source rectangle when the
 * currently displayed image region is already cropped from the original image.
 *
 * @param {{
 *   baseSourceRect: {
 *     sourceX: number,
 *     sourceY: number,
 *     sourceWidth: number,
 *     sourceHeight: number,
 *   },
 *   selection: { left: number, top: number, width: number, height: number },
 *   imageBounds: { left: number, top: number, width: number, height: number },
 * }} params
 * @returns {{
 *   sourceX: number,
 *   sourceY: number,
 *   sourceWidth: number,
 *   sourceHeight: number,
 * }}
 */
export function composeCropSourceRect({
    baseSourceRect,
    selection,
    imageBounds,
}) {
    const safeBaseSourceRect = {
        sourceX: Math.max(0, Number(baseSourceRect?.sourceX) || 0),
        sourceY: Math.max(0, Number(baseSourceRect?.sourceY) || 0),
        sourceWidth: Math.max(1, Number(baseSourceRect?.sourceWidth) || 1),
        sourceHeight: Math.max(1, Number(baseSourceRect?.sourceHeight) || 1),
    };
    const nestedSourceRect = computeCropSourceRectFromSelection({
        selection,
        imageBounds,
        imageWidth: safeBaseSourceRect.sourceWidth,
        imageHeight: safeBaseSourceRect.sourceHeight,
    });
    return {
        sourceX: safeBaseSourceRect.sourceX + nestedSourceRect.sourceX,
        sourceY: safeBaseSourceRect.sourceY + nestedSourceRect.sourceY,
        sourceWidth: nestedSourceRect.sourceWidth,
        sourceHeight: nestedSourceRect.sourceHeight,
    };
}
