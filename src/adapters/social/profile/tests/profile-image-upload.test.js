import test from "node:test";
import assert from "node:assert/strict";
import {
    BANNER_FULL_HEIGHT_ASPECT_RATIO,
    BANNER_HALF_HEIGHT_ASPECT_RATIO,
    resolveBannerCropAspectRatio,
} from "../ui/image-crop.js";

test("resolveBannerCropAspectRatio defaults banner uploads to half-height view", () => {
    assert.equal(
        resolveBannerCropAspectRatio(null),
        BANNER_HALF_HEIGHT_ASPECT_RATIO,
    );
    assert.equal(
        resolveBannerCropAspectRatio("half"),
        BANNER_HALF_HEIGHT_ASPECT_RATIO,
    );
});

test("resolveBannerCropAspectRatio honors full-height banner preference", () => {
    assert.equal(
        resolveBannerCropAspectRatio("full"),
        BANNER_FULL_HEIGHT_ASPECT_RATIO,
    );
});
