import test from "node:test";
import assert from "node:assert/strict";
import { versionOfflineWorker } from "../scripts/ui-build/offline-version.mjs";

test("worker generations and changed recovery resources receive distinct stable cache versions", () => {
    const worker = 'const CACHE_VERSION = "v8";';
    const initial = versionOfflineWorker(worker, [
        "manifest",
        "English catalog",
        "recovery HTML",
    ]);
    assert.match(initial, /"v8-[a-f0-9]{16}"/);
    assert.equal(
        initial,
        versionOfflineWorker(worker, [
            "manifest",
            "English catalog",
            "recovery HTML",
        ]),
    );
    assert.notEqual(
        initial,
        versionOfflineWorker(worker, [
            "manifest",
            "updated catalog",
            "recovery HTML",
        ]),
    );
    assert.notEqual(
        initial,
        versionOfflineWorker(worker, [
            "manifest",
            "English catalog",
            "updated HTML",
        ]),
    );
    assert.match(
        versionOfflineWorker('const CACHE_VERSION = "v9";', []),
        /"v9-[a-f0-9]{16}"/,
    );
    assert.throws(
        () => versionOfflineWorker("invalid worker", []),
        /Missing offline worker cache version/,
    );
});
