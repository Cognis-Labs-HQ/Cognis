import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const generalPreferencesSource = fs.readFileSync(
    new URL("../app/settings/general-prefs.js", import.meta.url),
    "utf8",
);
const settingsSource = fs.readFileSync(
    new URL("../app/settings/index.js", import.meta.url),
    "utf8",
);

test("adding a blank email displays a warning toast", () => {
    assert.match(
        generalPreferencesSource,
        /if \(!address\) \{\s*showToast\(i18n\.t\("ui\.reuse\.email_required"\), \{\s*variant: "warning",\s*\}\);\s*return;/,
    );
});

test("General settings remain continuous with the danger zone last", () => {
    const contributionsPosition = settingsSource.indexOf(
        "renderContributedSections(generalContributions)",
    );
    const dangerZonePosition = settingsSource.indexOf(
        '<section class="settings-danger-zone"',
        contributionsPosition,
    );

    assert.ok(contributionsPosition >= 0);
    assert.ok(dangerZonePosition > contributionsPosition);
    assert.doesNotMatch(settingsSource, /id: "danger-zone"/);
});
