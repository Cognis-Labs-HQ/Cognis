import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readDashboardSource() {
    return readFileSync(resolve(ROOT, "src/ui/app/dashboard/index.js"), "utf8");
}

test("dashboard includes a whiteboard validation element", () => {
    const source = readDashboardSource();
    assert.ok(
        source.includes('id: "whiteboard-validation"'),
        "dashboard should register a whiteboard validation element",
    );
    assert.ok(
        source.includes('id="dashboard-whiteboard-validation-spawn"'),
        "whiteboard validation element should render a spawn button",
    );
});

test("dashboard whiteboard validation element spawns via module API", () => {
    const source = readDashboardSource();
    assert.ok(
        source.includes(
            "/api/v1/modules/nextcloud-whiteboard/whiteboards/spawn",
        ),
        "dashboard whiteboard validation element should call the whiteboard spawn API",
    );
});

test("dashboard whiteboard validation element reports spawn outcomes with toasts", () => {
    const source = readDashboardSource();
    assert.ok(
        source.includes('import { showToast } from "../../reuse/toast.js";'),
        "dashboard should import showToast",
    );
    assert.ok(
        source.includes('{ variant: "success" }'),
        "dashboard should show a success toast after opening a whiteboard",
    );
    assert.ok(
        source.includes('{ variant: "warning" }'),
        "dashboard should show a warning toast when popups are blocked",
    );
    assert.ok(
        source.includes('{ variant: "error" }'),
        "dashboard should show an error toast when spawn fails",
    );
});

test("dashboard whiteboard validation strings exist in all UI languages", () => {
    const languageCodes = ["en", "de", "id", "ja"];
    const requiredKeys = [
        "ui.app.dashboard.element.whiteboard_validation.label",
        "ui.app.dashboard.element.whiteboard_validation.description",
        "ui.app.dashboard.element.whiteboard_validation.open",
        "ui.app.dashboard.element.whiteboard_validation.title_prefix",
        "ui.app.dashboard.element.whiteboard_validation.spawn_success",
        "ui.app.dashboard.element.whiteboard_validation.spawn_failed",
        "ui.app.dashboard.element.whiteboard_validation.popup_blocked",
    ];
    for (const languageCode of languageCodes) {
        const stringsSource = readFileSync(
            resolve(ROOT, `src/ui/languages/${languageCode}/strings.xml`),
            "utf8",
        );
        for (const key of requiredKeys) {
            assert.ok(
                stringsSource.includes(`name="${key}"`),
                `expected ${key} in ${languageCode} strings`,
            );
        }
    }
});
