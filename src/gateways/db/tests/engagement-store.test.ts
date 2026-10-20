import assert from "node:assert/strict";
import test from "node:test";
import { createEngagementStore } from "../reuse/engagement-store.js";
import { structuredStore } from "../../reuse/tests/structured-store.js";

test("the host ledger persists through recreation and enforces atomic participant revisions", async () => {
    const { db: executor } = structuredStore();
    const first = createEngagementStore(() => executor);
    const second = createEngagementStore(() => executor);
    const empty = { receipts: [], invalid: [], boosters: [] };
    await first.commit("learner", 0, empty);
    assert.deepEqual(await second.read("learner"), {
        revision: 1,
        state: empty,
    });
    await assert.rejects(
        second.commit("learner", 0, empty),
        /engagement_state_conflict/,
    );
    await first.commit("learner", 1, {
        receipts: [],
        invalid: ["drawing-one"],
        boosters: [],
    });
    await assert.rejects(
        second.commit("learner", 1, empty),
        /engagement_state_conflict/,
    );
    assert.deepEqual(await second.read("learner"), {
        revision: 2,
        state: { receipts: [], invalid: ["drawing-one"], boosters: [] },
    });
    assert.deepEqual(await second.read("another"), {
        revision: 0,
        state: empty,
    });
});

test("reward snapshots round-trip beyond a normal SQL TEXT field", async () => {
    const fixture = structuredStore();
    const executor = fixture.db;
    const store = createEngagementStore(() => executor);
    const state = {
        receipts: [],
        boosters: [],
        invalid: Array.from(
            { length: 5000 },
            (_, index) => `活動-𠮷-identifier-${index}`,
        ),
    };
    assert.ok(Buffer.byteLength(JSON.stringify(state)) > 65535);
    await store.commit("learner", 0, state);
    const recreated = createEngagementStore(() => executor);
    assert.deepEqual((await recreated.read("learner")).state, state);
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.table === "engagement_participant_parts",
    );
    await assert.rejects(
        store.commit("learner", 1, {
            ...state,
            invalid: [...state.invalid, "next"],
        }),
        /storage_failed/,
    );
    fixture.fail(() => false);
    assert.deepEqual(await recreated.read("learner"), { revision: 1, state });
    const empty = { receipts: [], invalid: [], boosters: [] };
    const writes = await Promise.allSettled([
        store.commit("learner", 1, empty),
        recreated.commit("learner", 1, state),
    ]);
    assert.equal(
        writes.filter(({ status }) => status === "fulfilled").length,
        1,
    );
    assert.deepEqual(await recreated.read("learner"), {
        revision: 2,
        state: empty,
    });
    assert.equal(fixture.rows("engagement_participant_parts").length, 0);
    assert.deepEqual(await recreated.read("other"), {
        revision: 0,
        state: empty,
    });
});

test("reward storage retries schema initialization after a failed attempt", async () => {
    const fixture = structuredStore();
    let reject = true;
    const executor = {
        ...fixture.db,
        async ensureTable(
            definition: Parameters<typeof fixture.db.ensureTable>[0],
        ) {
            if (reject) {
                reject = false;
                throw new Error("schema_unavailable");
            }
            await fixture.db.ensureTable(definition);
        },
    };
    const store = createEngagementStore(() => executor);
    await assert.rejects(store.read("learner"), /schema_unavailable/);
    assert.deepEqual(await store.read("learner"), {
        revision: 0,
        state: { receipts: [], invalid: [], boosters: [] },
    });
});
