import test from "node:test";
import assert from "node:assert/strict";
import { formatDateTime } from "../reuse/timestamp.js";

test("formatDateTime can include seconds when requested", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new Map([["cognis_timezone", "UTC"]]);

    globalThis.localStorage = {
        getItem(key) {
            return storage.has(key) ? storage.get(key) : null;
        },
        setItem(key, value) {
            storage.set(key, String(value));
        },
        removeItem(key) {
            storage.delete(key);
        },
    };

    try {
        const iso = "2026-05-09T00:00:59.000Z";

        assert.equal(
            formatDateTime(iso, "", { includeSeconds: true }),
            new Date(iso).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "medium",
                timeZone: "UTC",
            }),
        );
        assert.notEqual(
            formatDateTime(iso, "", { includeSeconds: true }),
            formatDateTime(iso),
        );
    } finally {
        globalThis.localStorage = previousLocalStorage;
    }
});
