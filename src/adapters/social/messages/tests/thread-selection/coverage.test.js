import test from "node:test";
import assert from "node:assert/strict";
import {
    createRenderer,
    createLoadedHistory,
    message,
    select,
} from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";
import { compactThreadCoverage } from "../../ui/thread-data.js";
import { createThreadView } from "../../ui/thread-dom.js";

function coverage(state) {
    const view = createThreadView(state.container, {
        roomId: "room",
        accountId: "learner",
        key: state.key,
        style: state.style,
    });
    try {
        return view.read().remoteCoverage;
    } finally {
        view.finish();
    }
}

test("advancing overlapping coverage compacts by active-read authority, not completed poll count", () => {
    let ranges = [];
    for (let index = 0; index < 1000; index++) {
        ranges = compactThreadCoverage(
            [
                ...ranges,
                {
                    lower: message("boundary", index).createdAt,
                    upper: null,
                    order: index + 2,
                },
            ],
            new Set([1]),
        );
        assert.equal(ranges.length, 1);
    }
    const older = { lower: "a", upper: "d", order: 2 };
    const newer = { lower: "c", upper: "f", order: 4 };
    assert.equal(
        compactThreadCoverage([older, newer], new Set([1, 3])).length,
        2,
    );
    assert.deepEqual(compactThreadCoverage([older, newer], new Set([1])), [
        { lower: "a", upper: "f", order: 2 },
    ]);
    assert.equal(
        compactThreadCoverage(
            [{ lower: "a", upper: "c", order: 2 }, newer],
            new Set([1]),
        ).length,
        2,
    );
    assert.deepEqual(compactThreadCoverage(ranges, new Set()), []);
});

test("real renderer retires compacted coverage once an older history read finishes", async (context) => {
    const state = await createLoadedHistory(context);
    const gate = deferred();
    let reached = false;
    state.decrypt = async (_key, record) => {
        if (record.id === "message-0") {
            reached = true;
            await gate.promise;
        }
        return record.ciphertext;
    };
    const pending = state.render({ before: message("boundary", 50).createdAt });
    await until(() => reached);
    const body = state.body("message-5");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    for (let index = 100; index < 108; index++) {
        state.messages.push(message(`message-${index}`, index));
        await state.render();
        assert.equal(coverage(state).length, 1);
    }
    await state.render({ before: message("boundary").createdAt });
    assert.equal(coverage(state).length, 2);
    gate.resolve();
    await pending;
    assert.equal(coverage(state).length, 0);
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
    assert.equal(state.body("message-5"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
});

test("a full page does not infer absence for omitted rows at its oldest tied timestamp", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    const retained = message("retained", 1);
    state.messages = [retained];
    await state.render();
    const body = state.body("retained");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    state.messages = [
        ...Array.from({ length: 50 }, (_, index) => message(`tie-${index}`, 1)),
        retained,
    ];
    await state.render();
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        51,
    );
    assert.equal(state.body("retained"), body);
    assert.equal(snapshot.selection.toString(), snapshot.text);
    await state.render({ before: retained.createdAt });
    assert.equal(
        state.body("retained"),
        body,
        "before is an exclusive upper boundary",
    );
    assert.equal(snapshot.selection.toString(), snapshot.text);
});
