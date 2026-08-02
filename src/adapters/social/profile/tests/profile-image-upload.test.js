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
const PROFILE_UPLOAD_SOURCE = readFileSync(
    resolve(
        dirname(fileURLToPath(import.meta.url)),
        "../ui/profile-image-upload.js",
    ),
    "utf8",
);
const PROFILE_APP_SOURCE = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../ui/app.js"),
    "utf8",
);

test("successful uploads refresh local blob state before follow-up requests", () => {
    const refreshIndex = PROFILE_UPLOAD_SOURCE.indexOf("refreshPage();");
    const preferenceIndex = PROFILE_UPLOAD_SOURCE.indexOf(
        "await saveBannerLayoutPreference",
    );

    assert.notEqual(refreshIndex, -1);
    assert.notEqual(preferenceIndex, -1);
    assert.ok(refreshIndex < preferenceIndex);
    assert.doesNotMatch(
        PROFILE_UPLOAD_SOURCE,
        /setState\(\{ profile: await loadOwnProfile\(\) \}\);/,
    );
});

test("successful uploads do not fail on optional follow-up data", () => {
    assert.match(
        PROFILE_UPLOAD_SOURCE,
        /try \{\s*responseData = \(await response\.json\(\)\)\?\.data \?\? \{\};\s*\} catch \{/,
    );
    assert.match(
        PROFILE_UPLOAD_SOURCE,
        /try \{\s*await saveBannerLayoutPreference\([\s\S]+?\);\s*\} catch \{/,
    );
});

test("profile image selection and upload reject duplicate activation", () => {
    assert.match(PROFILE_APP_SOURCE, /pendingImageSelections\.has\(kind\)/);
    assert.match(PROFILE_APP_SOURCE, /pendingImageSelections\.add\(kind\)/);
    assert.match(PROFILE_UPLOAD_SOURCE, /pendingUploads\.has\(kind\)/);
    assert.match(PROFILE_UPLOAD_SOURCE, /pendingUploads\.add\(kind\)/);
    assert.match(
        PROFILE_UPLOAD_SOURCE,
        /finally \{\s*pendingUploads\.delete\(kind\);\s*\}/,
    );
});

test("profile media refreshes only the profile hero composer card", () => {
    assert.match(
        PROFILE_APP_SOURCE,
        /function refreshProfileHero\(\) \{[\s\S]*?\[data-composer-element="hero"\][\s\S]*?heroHost\.innerHTML = heroElement\.render\(\);[\s\S]*?bindProfileHeroEvents\(\);/,
    );
    assert.match(
        PROFILE_APP_SOURCE,
        /createProfileImageUploadActions\(\{[\s\S]*?refreshPage: refreshProfileHero,/,
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
