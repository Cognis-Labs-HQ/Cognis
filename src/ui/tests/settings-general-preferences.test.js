import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const generalPreferencesSource = fs.readFileSync(
    new URL("../app/settings/general-prefs.js", import.meta.url),
    "utf8",
);

test("adding a blank email displays a warning toast", () => {
    assert.match(
        generalPreferencesSource,
        /if \(!address\) \{\s*showToast\(i18n\.t\("ui\.reuse\.email_required"\), \{\s*variant: "warning",\s*\}\);\s*return;/,
    );
});
