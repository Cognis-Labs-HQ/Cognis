import assert from "node:assert/strict";
import test from "node:test";
import {
    deferred,
    selectionFixture,
    wait,
    waitForRemoval,
} from "./selection-fixture.js";

test("Search removal observation awaits delayed callback completion", async (context) => {
    const fixture = await selectionFixture(context);
    const pending = deferred();
    const received = [];
    const popup = fixture.open({
        multiSelect: true,
        onSelectMultiple: (items) => {
            received.push(items.map((item) => item.id));
            return pending.promise;
        },
    });
    const [first, second] = await fixture.query(popup);
    first.querySelector("input").click();
    fixture.key(second, " ");
    popup.overlay.querySelector(".search-popup-confirm-btn").click();
    const removal = waitForRemoval(popup.overlay);
    await wait(180);
    assert.deepEqual(received, [["one", "two"]]);
    assert.equal(popup.overlay.isConnected, true);
    assert.equal(
        popup.overlay.classList.contains("search-popup-overlay--closing"),
        false,
    );
    pending.resolve();
    await removal;
    assert.equal(popup.overlay.isConnected, false);
    assert.deepEqual(received, [["one", "two"]]);
    await waitForRemoval(popup.overlay);
});

test("Search removal observation rejects when a callback keeps it open", async (context) => {
    const fixture = await selectionFixture(context);
    let calls = 0;
    const popup = fixture.open({
        onSelect: () => {
            calls += 1;
            return false;
        },
    });
    (await fixture.query(popup))[0].click();
    await assert.rejects(
        waitForRemoval(popup.overlay, 50),
        /Search overlay was not removed within 50ms/,
    );
    assert.equal(calls, 1);
    assert.equal(popup.overlay.isConnected, true);
    assert.equal(
        popup.overlay.classList.contains("search-popup-overlay--closing"),
        false,
    );
    assert.equal(popup.input.disabled, false);
});
