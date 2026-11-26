import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture(persist = async () => {}) {
    const writes = [],
        errors = [],
        removed = [];
    const toasts = [];
    const i18n = { t: String };
    const root = {
        querySelectorAll(selector) {
            assert.match(selector, /data-library-entry-status="canonical"/);
            return [0, 1].map((id) => ({ remove: () => removed.push(id) }));
        },
        addEventListener() {},
    };
    const api = loadTestModule(
        new URL("../ui/app/viewed-entries.js", import.meta.url),
        {
            "/static/gateways/study/library-client.js": {
                markLibraryEntriesViewed: async (ids) => {
                    writes.push(Array.from(ids));
                    return persist();
                },
            },
            "/static/reuse/toast.js": {
                showToast: (message) => toasts.push(message),
            },
            "/static/reuse/error-reporting.js": {
                reportClientError: (error) => errors.push(error),
            },
        },
        { CSS: { escape: String } },
    );
    return { ...api, root, writes, errors, removed, toasts, i18n };
}

test("deep-link details without a preview's New flag persist the canonical entry and clear every placement", async () => {
    const view = fixture();
    const detail = { id: "canonical" };
    const preview = { id: "canonical", isNew: true };
    const other = { id: "other", isNew: true };
    assert.equal(
        await view.markEntryViewed(
            view.root,
            detail,
            [preview, other],
            view.i18n,
        ),
        true,
    );
    assert.deepEqual(view.writes, [["canonical"]]);
    assert.equal(detail.isNew, false);
    assert.equal(preview.isNew, false);
    assert.equal(other.isNew, true);
    assert.deepEqual(view.removed, [0, 1]);
    await view.markEntryViewed(view.root, detail, [preview], view.i18n);
    assert.equal(view.writes.length, 1);
});

test("hover and detail opening share pending writes and failed writes remain retryable", async () => {
    let reject;
    const view = fixture(
        () =>
            new Promise((_resolve, fail) => {
                reject = fail;
            }),
    );
    const preview = { id: "canonical", isNew: true };
    const first = view.markEntryViewed(
        view.root,
        preview,
        [preview],
        view.i18n,
    );
    const second = view.markEntryViewed(
        view.root,
        { id: "canonical" },
        [preview],
        view.i18n,
    );
    await Promise.resolve();
    assert.equal(view.writes.length, 1);
    reject(new Error("private server detail"));
    assert.deepEqual(await Promise.all([first, second]), [false, false]);
    assert.equal(preview.isNew, true);
    assert.deepEqual(view.removed, []);
    assert.equal(view.errors.length, 1);
    assert.deepEqual(view.toasts, ["adapter.study.library.viewed_save_error"]);
    assert.ok(!JSON.stringify(view.errors).includes("private server detail"));
    const retry = view.markEntryViewed(
        view.root,
        preview,
        [preview],
        view.i18n,
    );
    await Promise.resolve();
    assert.equal(view.writes.length, 2);
    reject(new Error("retry rejected"));
    assert.equal(await retry, false);
});
