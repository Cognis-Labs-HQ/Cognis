import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

function fixture(receipt, { refreshError } = {}) {
    const notices = [];
    const refreshed = [];
    let profile = { displayName: "Before" };
    const { saveProfileFields } = loadTestModule(
        new URL("../ui/profile-save.js", import.meta.url),
        {
            "./client.js": {
                profileUiClient: {
                    updateProfile: async () => Response.json(receipt),
                },
            },
            "/static/layouts/dashboard-layout.js": {
                updateNavbarAvatar: async () => {},
            },
            "/static/reuse/toast.js": {
                showToast: (message) => notices.push(message),
            },
        },
        { localStorage: { setItem() {} }, console },
    );
    const save = (fields) =>
        saveProfileFields(fields, {
            getState: () => ({ profile }),
            setState: (next) => {
                profile = next.profile;
            },
            refreshProfileCards: (cards) => {
                if (refreshError) throw refreshError;
                refreshed.push(...cards);
            },
            bindProfileHeroEvents: () => {},
            i18n: { t: (key) => key },
        });
    return { save, notices, refreshed, profile: () => profile };
}

test("a queued profile is retained when refreshing its rendered cards fails", async () => {
    const state = fixture(
        { queued: true },
        { refreshError: new Error("view_unavailable") },
    );
    await state.save({ displayName: "Queued" });
    assert.equal(state.profile().displayName, "Queued");
    assert.equal(state.profile().queued, true);
    assert.deepEqual(state.notices, ["ui.app.profile.saved"]);
});

test("acknowledged profile edits repaint from the authoritative mutation response", async () => {
    const profile = { displayName: "Server name", bio: "Saved" };
    const state = fixture({ data: profile });
    await state.save({ displayName: "Input name" });
    assert.deepEqual(state.profile(), profile);
    assert.deepEqual(state.refreshed, ["hero", "social-links", "posts-new"]);
    assert.deepEqual(state.notices, ["ui.app.profile.saved"]);
});

test("durably buffered and acknowledged profiles keep the same success feedback", async () => {
    for (const queued of [false, true]) {
        const state = fixture({ queued, data: { displayName: "Saved" } });
        await state.save({ displayName: "Saved" });
        assert.deepEqual(state.notices, ["ui.app.profile.saved"]);
        assert.equal(state.profile().displayName, "Saved");
    }
});
