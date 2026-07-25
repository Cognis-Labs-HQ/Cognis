import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    BANNER_FULL_HEIGHT_ASPECT_RATIO,
    BANNER_HALF_HEIGHT_ASPECT_RATIO,
    resolveBannerCropAspectRatio,
} from "../ui/image-crop.js";

const PROFILE_RENDER_SOURCE = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../ui/profile-render.js"),
    "utf8",
);

test("profile hero images opt out of DOM preservation so uploads render immediately", () => {
    assert.match(
        PROFILE_RENDER_SOURCE,
        /class="profile-hero-avatar-img" data-composer-preserve="false"/,
    );
    assert.match(
        PROFILE_RENDER_SOURCE,
        /class="profile-hero-banner-img" data-composer-preserve="false"/,
    );
});

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

test("resolveBannerCropAspectRatio uses the visible banner frame when available", () => {
    assert.equal(
        resolveBannerCropAspectRatio("half", { width: 1200, height: 180 }),
        1200 / 180,
    );
    assert.equal(
        resolveBannerCropAspectRatio("full", { width: 1200, height: 360 }),
        1200 / 360,
    );
});

test("resolveBannerCropAspectRatio guards invalid visible frame sizes", () => {
    assert.equal(
        resolveBannerCropAspectRatio("half", { width: 0, height: 180 }),
        1 / 180,
    );
    assert.equal(
        resolveBannerCropAspectRatio("half", {
            width: Number.NaN,
            height: 180,
        }),
        BANNER_HALF_HEIGHT_ASPECT_RATIO,
    );
});
