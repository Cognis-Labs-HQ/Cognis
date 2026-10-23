import test from "node:test";
import assert from "node:assert/strict";
import { initDateTimePrefs } from "../app/settings/datetime-prefs.js";
import {
    applyTimezoneToLocalStorage,
    formatDateTime,
    getBrowserDetectedTimezone,
    syncTimezoneOnLogin,
} from "../reuse/timestamp.js";
import {
    loadUiPreferences,
    saveUiPreferences,
} from "../reuse/ui-preferences.js";

function createSelect() {
    const select = new EventTarget();
    select.options = [];
    select.value = "";
    select.append = (option) => select.options.push(option);
    return select;
}

function createController(existingPrefs = { timezone: "auto" }) {
    const timezone = createSelect();
    const format = createSelect();
    const dirty = [];
    const controller = initDateTimePrefs(
        {
            querySelector: (selector) =>
                selector === "#pref-timezone-select" ? timezone : format,
        },
        {
            existingPrefs,
            i18n: { t: (key) => `localized:${key}:{tz}` },
            onDirtyChange: (value) => dirty.push(value),
        },
    );
    controller.init();
    return { controller, timezone, format, dirty };
}

function selectTimezone(fixture, value) {
    assert.ok(
        fixture.timezone.options.some((option) => option.value === value),
    );
    fixture.timezone.value = value;
    fixture.timezone.dispatchEvent(new Event("change"));
}

const scenarios = [
    ["modern without UTC", () => ["America/Los_Angeles", "Asia/Tokyo"]],
    ["modern with UTC", () => ["UTC", "Asia/Tokyo", "UTC"]],
    ["unavailable", undefined],
    ["empty", () => []],
    [
        "throwing",
        () => {
            throw new RangeError("unsupported listing");
        },
    ],
];

for (const [name, listing] of scenarios) {
    for (const saved of ["auto", "UTC", "Etc/UTC", "America/Los_Angeles"]) {
        test(`${name} preserves ${saved} and offers one UTC choice`, (context) => {
            const originalDocument = globalThis.document;
            globalThis.document = { createElement: () => ({}) };
            context.after(() => {
                globalThis.document = originalDocument;
            });
            context.mock.method(
                Intl,
                "supportedValuesOf",
                listing ?? (() => []),
            );
            if (!listing) Intl.supportedValuesOf = undefined;
            const fixture = createController({ timezone: saved });
            const choices = fixture.timezone.options.map(
                (option) => option.value,
            );
            assert.equal(choices.filter((zone) => zone === "UTC").length, 1);
            assert.equal(new Set(choices).size, choices.length);
            assert.equal(choices[0], "auto");
            assert.equal(fixture.timezone.value, saved);
            assert.equal(fixture.controller.isDirty(), false);
            assert.deepEqual(fixture.dirty, []);
            assert.equal(
                fixture.timezone.options[0].textContent,
                `localized:ui.app.settings.datetime_tz_auto:${getBrowserDetectedTimezone()}`,
            );
            if (name === "modern without UTC")
                assert.ok(choices.includes("Asia/Tokyo"));
        });
    }
}

test("UTC selection discards or persists and formats after preferences reload", async (context) => {
    const originalDocument = globalThis.document;
    const originalStorage = globalThis.localStorage;
    globalThis.document = { createElement: () => ({}) };
    const storage = new Map([
        ["cognis_account", "timezone-test-account"],
        ["cognis_access_token", "fixture-token"],
        ["cognis_timezone", "America/Los_Angeles"],
    ]);
    globalThis.localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: (key) => storage.delete(key),
    };
    context.after(() => {
        globalThis.document = originalDocument;
        globalThis.localStorage = originalStorage;
    });
    context.mock.method(Intl, "supportedValuesOf", () => [
        "America/Los_Angeles",
    ]);
    let saved = { timezone: "auto", timeFormat: "24h", unrelated: "retained" };
    let writes = 0;
    context.mock.method(globalThis, "fetch", async (url, options) => {
        assert.equal(
            url,
            "/api/v1/social/users/timezone-test-account/preferences/ui-preferences",
        );
        if (options?.method === "PUT") {
            saved = JSON.parse(options.body).layout;
            writes += 1;
            return Response.json({ data: {} });
        }
        return Response.json({ data: { layoutJson: JSON.stringify(saved) } });
    });
    const fixture = createController(await loadUiPreferences());
    selectTimezone(fixture, "UTC");
    assert.equal(fixture.controller.isDirty(), true);
    assert.equal(fixture.dirty.at(-1), true);
    fixture.controller.discard();
    assert.equal(fixture.timezone.value, "auto");
    assert.equal(fixture.controller.isDirty(), false);
    assert.equal(fixture.dirty.at(-1), false);
    assert.equal(writes, 0);
    selectTimezone(fixture, "UTC");
    await saveUiPreferences({ timezone: fixture.controller.getTimezone() });
    applyTimezoneToLocalStorage(fixture.controller.getTimezone(), null);
    fixture.controller.commit();
    assert.equal(fixture.controller.isDirty(), false);
    assert.equal(writes, 1);
    assert.equal(saved.unrelated, "retained");
    storage.delete("cognis_timezone");
    await syncTimezoneOnLogin("timezone-test-account");
    const reloaded = createController(await loadUiPreferences());
    assert.equal(reloaded.timezone.value, "UTC");
    assert.equal(reloaded.format.value, "24h");
    assert.equal(storage.get("cognis_timezone"), "UTC");
    const instant = "2026-10-23T00:30:00.000Z";
    assert.equal(
        formatDateTime(instant),
        new Date(instant).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
            hour12: false,
            timeZone: "UTC",
        }),
    );
    assert.equal(writes, 1);
});
