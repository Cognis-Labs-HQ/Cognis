import {
    clampCropSelection,
    composeCropSourceRect,
    computeContainImageBounds,
    computeMaxAspectSourceRect,
    computeMovedCropSelection,
    computeResizedCropSelection,
    createInitialCropSelection,
    getCropOutputDimensions,
    panCropSourceRect,
} from "/static/adapters/social/profile/image-crop.js";

const POPUP_VIEWPORT_MAX_WIDTH = "95vw";
const POPUP_MAX_WIDTH_PX = 1400;
const POPUP_HORIZONTAL_CHROME_PX = 40;

function buildCropPopupBody({
    imageUrl,
    imageType,
    kind,
    aspectRatio,
    escapeHtmlText,
}) {
    const clampedAspect = Math.max(0.5, Number(aspectRatio) || 1);
    const popupClass =
        kind === "banner"
            ? "profile-image-crop-popup profile-image-crop-popup--banner"
            : "profile-image-crop-popup";
    return `
      <div class="${escapeHtmlText(popupClass)}">
        <div
          class="profile-image-crop-frame"
          data-crop-frame
          style="--crop-aspect-ratio: ${clampedAspect}; aspect-ratio: ${clampedAspect};"
        >
          <img
            class="profile-image-crop-image"
            data-crop-image
            src="${escapeHtmlText(imageUrl)}"
            alt="${escapeHtmlText(imageType)}"
            draggable="false"
          />
          <div class="profile-image-crop-selection" data-crop-selection>
            <div class="profile-image-crop-grid"></div>
            <span class="profile-image-crop-handle profile-image-crop-handle--n" data-crop-handle="n"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--s" data-crop-handle="s"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--e" data-crop-handle="e"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--w" data-crop-handle="w"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--ne" data-crop-handle="ne"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--nw" data-crop-handle="nw"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--se" data-crop-handle="se"></span>
            <span class="profile-image-crop-handle profile-image-crop-handle--sw" data-crop-handle="sw"></span>
          </div>
        </div>
      </div>
    `;
}

async function loadCropImage(file) {
    const imageUrl = URL.createObjectURL(file);
    const imageElement = new Image();
    imageElement.decoding = "async";
    imageElement.src = imageUrl;
    if (typeof imageElement.decode === "function") {
        await imageElement.decode().catch(() => {});
    }
    if (!imageElement.complete) {
        await new Promise((resolve, reject) => {
            imageElement.addEventListener("load", resolve, { once: true });
            imageElement.addEventListener(
                "error",
                () => reject(new Error("image_load_failed")),
                { once: true },
            );
        });
    }
    if (!imageElement.naturalWidth || !imageElement.naturalHeight) {
        URL.revokeObjectURL(imageUrl);
        throw new Error("image_load_failed");
    }
    return {
        imageUrl,
        imageWidth: imageElement.naturalWidth,
        imageHeight: imageElement.naturalHeight,
    };
}

/**
 * Opens crop popup interaction and returns cropped PNG blob on save.
 *
 * @param {{
 *   file: File,
 *   kind: "avatar" | "banner",
 *   aspectRatio: number,
 *   // "blob": return cropped PNG output
 *   // "sourceRect": return selected source rectangle (for preserving original media)
 *   outputMode?: "blob" | "sourceRect",
 *   openPopupDialog: (config: object) => Promise<string>,
 *   translate: (key: string) => string,
 *   escapeHtmlText: (value: string) => string,
 * }} params
 * @returns {Promise<Blob | {
 *   sourceRect: {
 *     sourceX: number,
 *     sourceY: number,
 *     sourceWidth: number,
 *     sourceHeight: number,
 *   },
 *   imageWidth: number,
 *   imageHeight: number,
 * } | null>}
 */
export async function openImageCropPopup({
    file,
    kind,
    aspectRatio,
    outputMode = "blob",
    openPopupDialog,
    translate,
    escapeHtmlText,
}) {
    const cropImage = await loadCropImage(file);
    const cropAspectRatio = Math.max(0.5, Number(aspectRatio) || 1);
    const defaultSourceRect = computeMaxAspectSourceRect({
        imageWidth: cropImage.imageWidth,
        imageHeight: cropImage.imageHeight,
        aspectRatio: cropAspectRatio,
    });
    const avatarPopupContentWidthPx = Math.sqrt(
        cropImage.imageWidth * cropImage.imageHeight,
    );
    const popupContentWidthPx =
        kind === "avatar"
            ? Math.min(avatarPopupContentWidthPx, defaultSourceRect.sourceWidth)
            : defaultSourceRect.sourceWidth;
    const popupMaxWidthPx = Math.min(
        POPUP_MAX_WIDTH_PX,
        Math.max(
            1,
            Math.round(popupContentWidthPx + POPUP_HORIZONTAL_CHROME_PX),
        ),
    );
    const cropInteractionController = new AbortController();
    const minimumSelectionSize = 64;
    const initialSelectionFillRatio = 1;
    const AUTO_ZOOM_MIN_DRAG_DISTANCE = 2;
    const MAX_AUTO_ZOOM_DEPTH = 12;
    const SOURCE_RECT_EPSILON = 0.001;
    const state = {
        dragging: false,
        dragPointerId: null,
        dragStartX: 0,
        dragStartY: 0,
        dragMode: "move",
        dragStartSelection: null,
        dragStartSourceRect: null,
        dragAnchorLeft: null,
        dragAnchorTop: null,
        displayBounds: null,
        selection: null,
        sourceRect: { ...defaultSourceRect },
        zoomDepth: 0,
        shouldAutoZoomOnRelease: false,
    };
    let frameElement = null;
    let imageElement = null;
    let selectionElement = null;
    let saveCropState = null;
    let renderQueued = false;

    function clampValue(value, minimum, maximum) {
        return Math.min(maximum, Math.max(minimum, value));
    }

    function resolvePointerPositionInFrame(event) {
        if (!(frameElement instanceof HTMLElement)) {
            return null;
        }
        const frameRect = frameElement.getBoundingClientRect();
        return {
            left: event.clientX - frameRect.left,
            top: event.clientY - frameRect.top,
        };
    }

    function isPointInsideBounds(point, bounds) {
        return (
            point.left >= bounds.left &&
            point.left <= bounds.left + bounds.width &&
            point.top >= bounds.top &&
            point.top <= bounds.top + bounds.height
        );
    }

    function clampPointerToDisplayBounds(pointerPosition, displayBounds) {
        return {
            left: clampValue(
                pointerPosition.left,
                displayBounds.left,
                displayBounds.left + displayBounds.width,
            ),
            top: clampValue(
                pointerPosition.top,
                displayBounds.top,
                displayBounds.top + displayBounds.height,
            ),
        };
    }

    function createSelectionFromAnchorDrag({
        anchorLeft,
        anchorTop,
        pointerLeft,
        pointerTop,
        bounds,
    }) {
        const maxWidth = Math.min(
            bounds.width,
            bounds.height * cropAspectRatio,
        );
        const minWidth = Math.min(maxWidth, minimumSelectionSize);
        const pointerDeltaLeft = pointerLeft - anchorLeft;
        const pointerDeltaTop = pointerTop - anchorTop;
        const widthConstrainedByHorizontal = Math.abs(pointerDeltaLeft);
        const widthConstrainedByVertical =
            Math.abs(pointerDeltaTop) * cropAspectRatio;
        const width = clampValue(
            Math.min(widthConstrainedByHorizontal, widthConstrainedByVertical),
            minWidth,
            maxWidth,
        );
        const height = width / cropAspectRatio;
        const left = pointerDeltaLeft >= 0 ? anchorLeft : anchorLeft - width;
        const top = pointerDeltaTop >= 0 ? anchorTop : anchorTop - height;
        return clampCropSelection({
            selection: {
                left,
                top,
                width,
                height,
            },
            bounds,
            aspectRatio: cropAspectRatio,
            minSize: minimumSelectionSize,
        });
    }

    function isFullImageSourceRect(sourceRect) {
        return (
            sourceRect.sourceX <= SOURCE_RECT_EPSILON &&
            sourceRect.sourceY <= SOURCE_RECT_EPSILON &&
            Math.abs(sourceRect.sourceWidth - cropImage.imageWidth) <=
                SOURCE_RECT_EPSILON &&
            Math.abs(sourceRect.sourceHeight - cropImage.imageHeight) <=
                SOURCE_RECT_EPSILON
        );
    }

    function renderCrop() {
        if (!(frameElement instanceof HTMLElement)) return;
        if (!(imageElement instanceof HTMLImageElement)) return;
        if (!(selectionElement instanceof HTMLElement)) return;
        const frameRect = frameElement.getBoundingClientRect();
        if (!state.sourceRect) {
            state.sourceRect = { ...defaultSourceRect };
        }
        const containBounds = computeContainImageBounds({
            imageWidth: cropImage.imageWidth,
            imageHeight: cropImage.imageHeight,
            frameWidth: frameRect.width,
            frameHeight: frameRect.height,
        });
        const useFullFrameBounds =
            state.zoomDepth > 0 || !isFullImageSourceRect(state.sourceRect);
        const displayBounds =
            useFullFrameBounds
                ? {
                      left: 0,
                      top: 0,
                      width: frameRect.width,
                      height: frameRect.height,
                  }
                : containBounds;
        if (displayBounds.width <= 0 || displayBounds.height <= 0) return;
        state.displayBounds = displayBounds;
        const safeSourceWidth = Math.max(1, state.sourceRect.sourceWidth);
        const safeSourceHeight = Math.max(1, state.sourceRect.sourceHeight);
        const sourceScale = Math.min(
            displayBounds.width / safeSourceWidth,
            displayBounds.height / safeSourceHeight,
        );
        const scaledImageWidth = cropImage.imageWidth * sourceScale;
        const scaledImageHeight = cropImage.imageHeight * sourceScale;
        const imageTranslateX =
            displayBounds.left - state.sourceRect.sourceX * sourceScale;
        const imageTranslateY =
            displayBounds.top - state.sourceRect.sourceY * sourceScale;
        imageElement.style.width = `${scaledImageWidth}px`;
        imageElement.style.height = `${scaledImageHeight}px`;
        imageElement.style.transform = `translate(${imageTranslateX}px, ${imageTranslateY}px)`;
        if (!state.selection) {
            state.selection = createInitialCropSelection({
                bounds: displayBounds,
                aspectRatio: cropAspectRatio,
                minSize: minimumSelectionSize,
                fillRatio: initialSelectionFillRatio,
            });
        } else {
            state.selection = clampCropSelection({
                selection: state.selection,
                bounds: displayBounds,
                aspectRatio: cropAspectRatio,
                minSize: minimumSelectionSize,
            });
        }
        selectionElement.style.left = `${state.selection.left}px`;
        selectionElement.style.top = `${state.selection.top}px`;
        selectionElement.style.width = `${state.selection.width}px`;
        selectionElement.style.height = `${state.selection.height}px`;
        saveCropState = {
            selection: state.selection,
            imageBounds: displayBounds,
            sourceRect: state.sourceRect,
        };
    }

    function queueRender() {
        if (renderQueued) return;
        renderQueued = true;
        requestAnimationFrame(() => {
            renderQueued = false;
            renderCrop();
        });
    }

    function resetCrop() {
        state.zoomDepth = 0;
        state.sourceRect = { ...defaultSourceRect };
        state.selection = null;
        state.shouldAutoZoomOnRelease = false;
    }

    function getSelectedSourceRect() {
        if (!state.selection || !state.displayBounds || !state.sourceRect) {
            return null;
        }
        return composeCropSourceRect({
            baseSourceRect: state.sourceRect,
            selection: state.selection,
            imageBounds: state.displayBounds,
        });
    }

    function handlePointerDown(event) {
        if (!(frameElement instanceof HTMLElement)) return;
        if (!(event.target instanceof HTMLElement)) return;
        if (!(selectionElement instanceof HTMLElement)) return;
        if (!state.selection || !state.displayBounds) return;
        const pointerPosition = resolvePointerPositionInFrame(event);
        if (!pointerPosition) return;
        const clampedPointerPosition = clampPointerToDisplayBounds(
            pointerPosition,
            state.displayBounds,
        );
        const pointerTarget = event.target.closest("[data-crop-handle]");
        if (pointerTarget instanceof HTMLElement) {
            state.dragMode = pointerTarget.dataset.cropHandle || "move";
        } else if (selectionElement.contains(event.target)) {
            state.dragMode = "move";
        } else if (isPointInsideBounds(pointerPosition, state.displayBounds)) {
            state.dragMode = "draw";
            state.dragAnchorLeft = clampedPointerPosition.left;
            state.dragAnchorTop = clampedPointerPosition.top;
        } else {
            return;
        }
        event.preventDefault();
        state.dragging = true;
        state.dragPointerId = event.pointerId;
        state.dragStartX = event.clientX;
        state.dragStartY = event.clientY;
        state.dragStartSelection = { ...state.selection };
        state.dragStartSourceRect = state.sourceRect
            ? { ...state.sourceRect }
            : null;
        state.shouldAutoZoomOnRelease = false;
        frameElement.setPointerCapture(event.pointerId);
        frameElement.classList.add("profile-image-crop-frame--dragging");
    }

    function handlePointerMove(event) {
        if (!state.dragging || state.dragPointerId !== event.pointerId) return;
        if (!state.dragStartSelection || !state.displayBounds) return;
        const deltaX = event.clientX - state.dragStartX;
        const deltaY = event.clientY - state.dragStartY;
        const shouldPanZoomedViewport =
            state.zoomDepth > 0 && state.dragMode === "move";
        if (
            !shouldPanZoomedViewport &&
            (Math.abs(deltaX) > AUTO_ZOOM_MIN_DRAG_DISTANCE ||
                Math.abs(deltaY) > AUTO_ZOOM_MIN_DRAG_DISTANCE)
        ) {
            state.shouldAutoZoomOnRelease = true;
        }
        if (state.dragMode === "move") {
            if (shouldPanZoomedViewport && state.dragStartSourceRect) {
                const startSourceRect = state.dragStartSourceRect;
                const sourceRegionDeltaX =
                    (deltaX / state.displayBounds.width) *
                    startSourceRect.sourceWidth;
                const sourceRegionDeltaY =
                    (deltaY / state.displayBounds.height) *
                    startSourceRect.sourceHeight;
                state.sourceRect = panCropSourceRect({
                    startSourceRect,
                    sourceDeltaX: sourceRegionDeltaX,
                    sourceDeltaY: sourceRegionDeltaY,
                    imageWidth: cropImage.imageWidth,
                    imageHeight: cropImage.imageHeight,
                });
                state.selection = { ...state.dragStartSelection };
                state.shouldAutoZoomOnRelease = false;
            } else {
                state.selection = computeMovedCropSelection({
                    startSelection: state.dragStartSelection,
                    deltaX,
                    deltaY,
                    bounds: state.displayBounds,
                });
            }
        } else if (state.dragMode === "draw") {
            const pointerPosition = resolvePointerPositionInFrame(event);
            if (!pointerPosition) return;
            const clampedPointerPosition = clampPointerToDisplayBounds(
                pointerPosition,
                state.displayBounds,
            );
            if (state.dragAnchorLeft === null || state.dragAnchorTop === null) {
                return;
            }
            state.selection = createSelectionFromAnchorDrag({
                anchorLeft: state.dragAnchorLeft,
                anchorTop: state.dragAnchorTop,
                pointerLeft: clampedPointerPosition.left,
                pointerTop: clampedPointerPosition.top,
                bounds: state.displayBounds,
            });
        } else {
            state.selection = computeResizedCropSelection({
                startSelection: state.dragStartSelection,
                handle: state.dragMode,
                deltaX,
                deltaY,
                bounds: state.displayBounds,
                aspectRatio: cropAspectRatio,
                minSize: minimumSelectionSize,
            });
        }
        queueRender();
    }

    function finishDrag(event) {
        if (state.dragPointerId !== event.pointerId) return;
        state.dragging = false;
        if (frameElement instanceof HTMLElement) {
            frameElement.classList.remove("profile-image-crop-frame--dragging");
            if (frameElement.hasPointerCapture(event.pointerId)) {
                frameElement.releasePointerCapture(event.pointerId);
            }
        }
        state.dragPointerId = null;
        state.dragStartSelection = null;
        state.dragStartSourceRect = null;
        state.dragAnchorLeft = null;
        state.dragAnchorTop = null;
        state.dragMode = "move";
        if (
            state.shouldAutoZoomOnRelease &&
            state.zoomDepth < MAX_AUTO_ZOOM_DEPTH
        ) {
            const selectedSourceRect = getSelectedSourceRect();
            if (selectedSourceRect) {
                state.sourceRect = selectedSourceRect;
                state.zoomDepth += 1;
                if (frameElement instanceof HTMLElement) {
                    const frameRect = frameElement.getBoundingClientRect();
                    state.selection = createInitialCropSelection({
                        bounds: {
                            left: 0,
                            top: 0,
                            width: frameRect.width,
                            height: frameRect.height,
                        },
                        aspectRatio: cropAspectRatio,
                        minSize: minimumSelectionSize,
                        fillRatio: initialSelectionFillRatio,
                    });
                } else {
                    state.selection = null;
                }
            }
        }
        state.shouldAutoZoomOnRelease = false;
        queueRender();
    }

    const popupResult = await openPopupDialog({
        title: translate(
            kind === "avatar"
                ? "ui.app.profile.crop_avatar_title"
                : "ui.app.profile.crop_banner_title",
        ),
        body: () =>
            buildCropPopupBody({
                imageUrl: cropImage.imageUrl,
                imageType: file.name,
                kind,
                aspectRatio: cropAspectRatio,
                escapeHtmlText,
            }),
        maxWidth: `min(${POPUP_VIEWPORT_MAX_WIDTH}, ${popupMaxWidthPx}px)`,
        actions: [
            {
                id: "reset",
                label: translate("ui.reuse.reset"),
                variant: "neutral",
            },
            {
                id: "cancel",
                label: translate("ui.reuse.cancel"),
                variant: "cancel",
            },
            {
                id: "save",
                label: translate("ui.reuse.save"),
                variant: "confirm",
            },
        ],
        onOpen: (overlay) => {
            frameElement = overlay.querySelector("[data-crop-frame]");
            imageElement = overlay.querySelector("[data-crop-image]");
            selectionElement = overlay.querySelector("[data-crop-selection]");
            if (!(frameElement instanceof HTMLElement)) return;
            if (!(imageElement instanceof HTMLImageElement)) return;
            if (!(selectionElement instanceof HTMLElement)) return;

            frameElement.addEventListener("pointerdown", handlePointerDown, {
                signal: cropInteractionController.signal,
            });
            frameElement.addEventListener("pointermove", handlePointerMove, {
                signal: cropInteractionController.signal,
            });
            frameElement.addEventListener("pointerup", finishDrag, {
                signal: cropInteractionController.signal,
            });
            frameElement.addEventListener("pointercancel", finishDrag, {
                signal: cropInteractionController.signal,
            });
            frameElement.addEventListener("lostpointercapture", finishDrag, {
                signal: cropInteractionController.signal,
            });
            frameElement.addEventListener(
                "dragstart",
                (event) => {
                    event.preventDefault();
                },
                { signal: cropInteractionController.signal },
            );
            window.addEventListener("resize", queueRender, {
                signal: cropInteractionController.signal,
            });
            queueRender();
        },
        onAction: (actionId) => {
            if (actionId !== "reset") return;
            resetCrop();
            queueRender();
            return false;
        },
    });

    cropInteractionController.abort();
    if (popupResult !== "save" || !saveCropState) {
        URL.revokeObjectURL(cropImage.imageUrl);
        return null;
    }

    const sourceRect = composeCropSourceRect({
        baseSourceRect: saveCropState.sourceRect ?? {
            sourceX: 0,
            sourceY: 0,
            sourceWidth: cropImage.imageWidth,
            sourceHeight: cropImage.imageHeight,
        },
        selection: saveCropState.selection,
        imageBounds: saveCropState.imageBounds,
    });
    if (outputMode === "sourceRect") {
        URL.revokeObjectURL(cropImage.imageUrl);
        return {
            sourceRect,
            imageWidth: cropImage.imageWidth,
            imageHeight: cropImage.imageHeight,
        };
    }
    const outputDimensions =
        kind === "avatar"
            ? { width: 1024, height: 1024 }
            : getCropOutputDimensions(aspectRatio, 1600);
    const canvas = document.createElement("canvas");
    canvas.width = outputDimensions.width;
    canvas.height = outputDimensions.height;
    const context = canvas.getContext("2d");
    if (!context) {
        URL.revokeObjectURL(cropImage.imageUrl);
        throw new Error("canvas_context_unavailable");
    }
    context.drawImage(
        imageElement,
        sourceRect.sourceX,
        sourceRect.sourceY,
        sourceRect.sourceWidth,
        sourceRect.sourceHeight,
        0,
        0,
        outputDimensions.width,
        outputDimensions.height,
    );
    const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, "image/png");
    });
    URL.revokeObjectURL(cropImage.imageUrl);
    return blob;
}
