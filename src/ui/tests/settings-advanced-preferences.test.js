import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { resolveReleaseChangelogStatus } from "../layouts/release-changelog/status.js";

const settingsSource = fs.readFileSync(
    new URL("../app/settings/index.js", import.meta.url),
    "utf8",
);
const editorSource = fs.readFileSync(
    new URL("../app/settings/advanced-prefs.js", import.meta.url),
    "utf8",
);
const acknowledgementSource = fs.readFileSync(
    new URL("../app/settings/editor-acknowledgement.js", import.meta.url),
    "utf8",
);
const releasePopupSource = fs.readFileSync(
    new URL("../layouts/release-changelog/popup.js", import.meta.url),
    "utf8",
);

test("advanced preferences require remembered consent and use dirty tracking", () => {
    assert.match(editorSource, /openPopup\(\{/);
    assert.match(settingsSource, /loadEditorAcknowledgement\(\)/);
    assert.match(editorSource, /await saveAcknowledgement\?\.\(\)/);
    assert.match(acknowledgementSource, /preferences-editor-acknowledgement/);
    assert.match(editorSource, /createFormDirtyTracker\(editor\.parentElement/);
    assert.match(settingsSource, /advancedPrefs\.getPreferences\(\)/);
    assert.match(settingsSource, /preferences_invalid_json/);
});

test("dirty form controls are merged when advanced preferences are edited", () => {
    assert.match(settingsSource, /if \(fontPrefs\?\.isDirty\(\)\)/);
    assert.match(settingsSource, /if \(languagePrefs\?\.isDirty\(\)\)/);
    assert.match(settingsSource, /if \(themePrefs\?\.isDirty\(\)\)/);
    assert.match(settingsSource, /if \(datetimePrefs\?\.isDirty\(\)\)/);
    assert.match(settingsSource, /if \(messageStylePrefs\?\.isDirty\(\)\)/);
    assert.match(settingsSource, /if \(releaseNotesPrefs\?\.isDirty\(\)\)/);
});

test("release acknowledgement state is stored outside editable UI preferences", () => {
    assert.match(releasePopupSource, /loadReleaseChangelogState\(\)/);
    assert.match(releasePopupSource, /saveReleaseChangelogState\(\{/);
});

test("release changelog headings link to their full changelog documents", () => {
    assert.match(
        releasePopupSource,
        /<a href="\$\{safePath\}">\$\{safeTitle\}<\/a>/,
    );
    assert.match(releasePopupSource, /entry\.sourceName/);
});

test("release changelogs remain safe when editable preferences contain no seen slugs", () => {
    const releaseEntries = [{ slug: "first-release" }];
    const status = resolveReleaseChangelogStatus(releaseEntries, "1.0.0", null);

    assert.deepEqual(status.unseenEntries, releaseEntries);
    assert.equal(status.versionChanged, true);
});
