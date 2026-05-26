import test from "node:test";
import assert from "node:assert/strict";
import {
    clampCropOffset,
    computeCropSourceRect,
    computeCropViewport,
    getCropOutputDimensions,
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

test("getCropOutputDimensions keeps target width and applies ratio", () => {
    const dimensions = getCropOutputDimensions(4, 1600);

    assert.equal(dimensions.width, 1600);
    assert.equal(dimensions.height, 400);
});
