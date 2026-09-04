import test from "node:test";
import assert from "node:assert/strict";
import { formatDateTime, formatTime } from "../reuse/timestamp.js";

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

test("formatTime respects the saved 12-hour preference", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new Map([
        ["cognis_timezone", "UTC"],
        ["cognis_time_format", "12h"],
    ]);

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
        const iso = "2026-05-09T17:05:00.000Z";

        assert.equal(
            formatTime(iso),
            new Date(iso).toLocaleTimeString(undefined, {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "UTC",
            }),
        );
    } finally {
        globalThis.localStorage = previousLocalStorage;
    }
});

test("formatDateTime respects the saved 24-hour preference", () => {
    const previousLocalStorage = globalThis.localStorage;
    const storage = new Map([
        ["cognis_timezone", "UTC"],
        ["cognis_time_format", "24h"],
    ]);

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
        const iso = "2026-05-09T17:05:00.000Z";

        assert.equal(
            formatDateTime(iso),
            new Date(iso).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
                hour12: false,
                timeZone: "UTC",
            }),
        );
    } finally {
        globalThis.localStorage = previousLocalStorage;
    }
});
