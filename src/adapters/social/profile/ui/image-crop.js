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
