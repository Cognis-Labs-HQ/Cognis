import assert from "node:assert/strict";
import test from "node:test";
import { structuredStore } from "../../../../gateways/reuse/tests/structured-store.js";
import { DbLeaderboardStore, type LeaderboardState } from "../store.js";

test("large leaderboard snapshots round-trip in bounded rows and failed replacements preserve the saved state", async () => {
    const fixture = structuredStore();
    const store = new DbLeaderboardStore(fixture.db);
    await store.ensureSchema();
    const state: LeaderboardState = {
        definitions: [],
        observations: [],
        cohorts: [],
        participation: [],
        invalid: Array.from(
            { length: 10000 },
            (_, index) => `activity-${index}-猫𠮷`,
        ),
        archives: [],
    };
    await store.save(state);
    assert.ok(fixture.rows("study_leaderboard_state").length > 1);
    assert.deepEqual(await new DbLeaderboardStore(fixture.db).load(), state);
    fixture.fail(
        (command) =>
            command.option === "INSERT" &&
            command.values.state_id !== "current",
    );
    await assert.rejects(
        store.save({ ...state, invalid: [...state.invalid, "another"] }),
        /storage_failed/,
    );
    fixture.fail(() => false);
    assert.deepEqual(await store.load(), state);
    await store.save({ ...state, invalid: [] });
    assert.equal(fixture.rows("study_leaderboard_state").length, 1);
    assert.deepEqual((await store.load())!.invalid, []);
});
