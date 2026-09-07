import test from "node:test";
import assert from "node:assert/strict";
import {
    clampCropSelection,
    clampCropOffset,
    composeCropSourceRect,
    computeContainImageBounds,
    computeMaxAspectSourceRect,
    computeCropSourceRectFromSelection,
    computeCropSourceRect,
    computeCropViewport,
    computeMovedCropSelection,
    panCropSourceRect,
    computeResizedCropSelection,
    createInitialCropSelection,
    getCropOutputDimensions,
    sourceRectToCoverObjectPositionPercent,
} from "../ui/image-crop.js";

test("clampCropOffset limits offsets to range", () => {
    assert.equal(clampCropOffset(24, 10), 10);
    assert.equal(clampCropOffset(-24, 10), -10);
    assert.equal(clampCropOffset(3, 10), 3);
});

test("computeCropViewport clamps drag offsets to keep frame covered", () => {
    const viewport = computeCropViewport({
        imageWidth: 1200,
        imageHeight: 800,
        frameWidth: 600,
        frameHeight: 300,
        zoom: 1.25,
        offsetX: 999,
        offsetY: -999,
    });

    assert.equal(viewport.offsetX, viewport.maxOffsetX);
    assert.equal(viewport.offsetY, -viewport.maxOffsetY);
    assert.ok(viewport.renderedWidth >= viewport.frameWidth);
    assert.ok(viewport.renderedHeight >= viewport.frameHeight);
});

test("computeCropSourceRect moves source window opposite drag direction", () => {
    const centeredViewport = computeCropViewport({
        imageWidth: 1000,
        imageHeight: 500,
        frameWidth: 500,
        frameHeight: 250,
        zoom: 1.4,
        offsetX: 0,
        offsetY: 0,
    });
    const movedViewport = computeCropViewport({
        imageWidth: 1000,
        imageHeight: 500,
        frameWidth: 500,
        frameHeight: 250,
        zoom: 1.4,
        offsetX: 80,
        offsetY: 30,
    });
    const centeredSource = computeCropSourceRect(centeredViewport);
    const movedSource = computeCropSourceRect(movedViewport);

    assert.ok(movedSource.sourceX < centeredSource.sourceX);
    assert.ok(movedSource.sourceY < centeredSource.sourceY);
    assert.equal(centeredSource.sourceWidth, movedSource.sourceWidth);
    assert.equal(centeredSource.sourceHeight, movedSource.sourceHeight);
});

test("computeCropSourceRect stays within image bounds for landscape offsets", () => {
    const viewport = computeCropViewport({
        imageWidth: 2400,
        imageHeight: 900,
        frameWidth: 600,
        frameHeight: 300,
        zoom: 1.8,
        offsetX: -9999,
        offsetY: 9999,
    });
    const source = computeCropSourceRect(viewport);

    assert.ok(source.sourceX >= 0);
    assert.ok(source.sourceY >= 0);
    assert.ok(source.sourceX + source.sourceWidth <= viewport.imageWidth);
    assert.ok(source.sourceY + source.sourceHeight <= viewport.imageHeight);
});

test("getCropOutputDimensions keeps target width and applies ratio", () => {
    const dimensions = getCropOutputDimensions(4, 1600);

    assert.equal(dimensions.width, 1600);
    assert.equal(dimensions.height, 400);
});

test("computeContainImageBounds centers contained image inside frame", () => {
    const imageBounds = computeContainImageBounds({
        imageWidth: 1600,
        imageHeight: 900,
        frameWidth: 400,
        frameHeight: 400,
    });

    assert.equal(imageBounds.width, 400);
    assert.equal(imageBounds.height, 225);
    assert.equal(imageBounds.left, 0);
    assert.equal(imageBounds.top, 87.5);
});

test("computeMaxAspectSourceRect keeps full width for tall source images", () => {
    const sourceRect = computeMaxAspectSourceRect({
        imageWidth: 900,
        imageHeight: 1200,
        aspectRatio: 3,
    });

    assert.equal(sourceRect.sourceX, 0);
    assert.equal(sourceRect.sourceWidth, 900);
    assert.equal(sourceRect.sourceHeight, 300);
    assert.equal(sourceRect.sourceY, 450);
});

test("computeMaxAspectSourceRect keeps full height for wide source images", () => {
    const sourceRect = computeMaxAspectSourceRect({
        imageWidth: 2400,
        imageHeight: 900,
        aspectRatio: 1,
    });

    assert.equal(sourceRect.sourceY, 0);
    assert.equal(sourceRect.sourceHeight, 900);
    assert.equal(sourceRect.sourceWidth, 900);
    assert.equal(sourceRect.sourceX, 750);
});

test("sourceRectToCoverObjectPositionPercent uses overflow distance for pan", () => {
    const pan = sourceRectToCoverObjectPositionPercent(
        {
            sourceX: 0,
            sourceY: 300,
            sourceWidth: 900,
            sourceHeight: 300,
        },
        900,
        1200,
    );

    assert.equal(pan.panX, 50);
    assert.equal(pan.panY, 33.33333333333333);
});

test("sourceRectToCoverObjectPositionPercent keeps centered crop at 50/50", () => {
    const pan = sourceRectToCoverObjectPositionPercent(
        {
            sourceX: 300,
            sourceY: 300,
            sourceWidth: 600,
            sourceHeight: 600,
        },
        1200,
        1200,
    );

    assert.equal(pan.panX, 50);
    assert.equal(pan.panY, 50);
});

test("createInitialCropSelection uses centered max-size area for target ratio", () => {
    const selection = createInitialCropSelection({
        bounds: { left: 10, top: 20, width: 500, height: 300 },
        aspectRatio: 2,
    });

    assert.equal(selection.width / selection.height, 2);
    assert.equal(selection.width, 500);
    assert.equal(selection.height, 250);
    assert.equal(selection.left, 10);
    assert.equal(selection.top, 45);
});

test("clampCropSelection keeps selection inside bounds", () => {
    const clampedSelection = clampCropSelection({
        selection: { left: -40, top: -20, width: 450, height: 225 },
        bounds: { left: 0, top: 0, width: 300, height: 300 },
        aspectRatio: 2,
    });

    assert.equal(clampedSelection.left, 0);
    assert.equal(clampedSelection.top, 0);
    assert.equal(clampedSelection.width, 300);
    assert.equal(clampedSelection.height, 150);
});

test("computeMovedCropSelection clamps translated selection to image bounds", () => {
    const movedSelection = computeMovedCropSelection({
        startSelection: { left: 20, top: 30, width: 100, height: 120 },
        deltaX: 999,
        deltaY: -999,
        bounds: { left: 0, top: 0, width: 400, height: 300 },
    });

    assert.equal(movedSelection.left, 300);
    assert.equal(movedSelection.top, 0);
    assert.equal(movedSelection.width, 100);
    assert.equal(movedSelection.height, 120);
});

test("computeResizedCropSelection resizes from east edge and preserves ratio", () => {
    const resizedSelection = computeResizedCropSelection({
        startSelection: { left: 40, top: 50, width: 120, height: 120 },
        handle: "e",
        deltaX: 60,
        deltaY: 0,
        bounds: { left: 0, top: 0, width: 300, height: 300 },
        aspectRatio: 1,
    });

    assert.equal(resizedSelection.left, 40);
    assert.equal(resizedSelection.width, 180);
    assert.equal(resizedSelection.height, 180);
});

test("computeCropSourceRectFromSelection maps selection to source image pixels", () => {
    const sourceRect = computeCropSourceRectFromSelection({
        selection: { left: 100, top: 150, width: 200, height: 100 },
        imageBounds: { left: 50, top: 100, width: 400, height: 200 },
        imageWidth: 1600,
        imageHeight: 800,
    });

    assert.equal(sourceRect.sourceX, 200);
    assert.equal(sourceRect.sourceY, 200);
    assert.equal(sourceRect.sourceWidth, 800);
    assert.equal(sourceRect.sourceHeight, 400);
});

test("computeCropSourceRectFromSelection clamps overextended selection safely", () => {
    const sourceRect = computeCropSourceRectFromSelection({
        selection: { left: -100, top: 50, width: 700, height: 300 },
        imageBounds: { left: 0, top: 0, width: 600, height: 250 },
        imageWidth: 1800,
        imageHeight: 750,
    });

    assert.equal(sourceRect.sourceX, 0);
    assert.ok(sourceRect.sourceY >= 0);
    assert.ok(sourceRect.sourceWidth <= 1800);
    assert.ok(sourceRect.sourceHeight <= 750);
    assert.ok(sourceRect.sourceX + sourceRect.sourceWidth <= 1800);
    assert.ok(sourceRect.sourceY + sourceRect.sourceHeight <= 750);
});

test("composeCropSourceRect maps nested crop selection into original image", () => {
    const sourceRect = composeCropSourceRect({
        baseSourceRect: {
            sourceX: 200,
            sourceY: 100,
            sourceWidth: 1200,
            sourceHeight: 600,
        },
        selection: { left: 100, top: 50, width: 200, height: 100 },
        imageBounds: { left: 0, top: 0, width: 400, height: 200 },
    });

    assert.equal(sourceRect.sourceX, 500);
    assert.equal(sourceRect.sourceY, 250);
    assert.equal(sourceRect.sourceWidth, 600);
    assert.equal(sourceRect.sourceHeight, 300);
});

test("panCropSourceRect pans without changing zoom dimensions", () => {
    const pannedRect = panCropSourceRect({
        startSourceRect: {
            sourceX: 100,
            sourceY: 80,
            sourceWidth: 600,
            sourceHeight: 300,
        },
        sourceDeltaX: 150,
        sourceDeltaY: -120,
        imageWidth: 1600,
        imageHeight: 900,
    });

    assert.equal(pannedRect.sourceX, 250);
    assert.equal(pannedRect.sourceY, 0);
    assert.equal(pannedRect.sourceWidth, 600);
    assert.equal(pannedRect.sourceHeight, 300);
});

test("panCropSourceRect clamps pan to image bounds", () => {
    const pannedRect = panCropSourceRect({
        startSourceRect: {
            sourceX: 900,
            sourceY: 500,
            sourceWidth: 700,
            sourceHeight: 400,
        },
        sourceDeltaX: 999,
        sourceDeltaY: 999,
        imageWidth: 1600,
        imageHeight: 900,
    });

    assert.equal(pannedRect.sourceX, 900);
    assert.equal(pannedRect.sourceY, 500);
    assert.equal(pannedRect.sourceWidth, 700);
    assert.equal(pannedRect.sourceHeight, 400);
});
