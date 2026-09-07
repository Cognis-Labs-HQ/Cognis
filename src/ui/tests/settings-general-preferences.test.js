import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderAccountOperationButton } from "../app/settings/search-index.js";

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

test("General settings can render account operation controls", () => {
    const i18n = { t: (key) => key };
    const button = renderAccountOperationButton(
        i18n,
        "archive",
        "ui.app.settings.danger_archive",
        "ui.app.settings.danger_archive_warning",
    );

    assert.match(button, /data-account-action="archive"/);
    assert.match(button, /ui\.app\.settings\.danger_archive<\/button>/);
});
