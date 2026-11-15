import assert from "node:assert/strict";
import test from "node:test";
import { deferred, selectionFixture, wait } from "./selection-fixture.js";

test("Search batch selection uses native activation and preserves its selection", async (context) => {
    const fixture = await selectionFixture(context);
    for (const grouped of [false, true]) {
        await context.test(
            `${grouped ? "grouped" : "flat"} checkbox, keyboard, click and retry use the same owner`,
            async () => {
                await fixture.reset();
                if (grouped)
                    fixture.results.splice(
                        0,
                        2,
                        {
                            category: "First",
                            items: [
                                {
                                    id: "one",
                                    label: "Fixture one",
                                    url: "/one",
                                },
                            ],
                        },
                        {
                            category: "Second",
                            items: [
                                {
                                    id: "two",
                                    label: "Fixture two",
                                    url: "/two",
                                },
                            ],
                        },
                    );
                const pending = deferred();
                const received = [];
                const popup = fixture.open({
                    multiSelect: true,
                    onSelectMultiple: (items) => {
                        received.push(items.map((item) => item.id));
                        return received.length === 1
                            ? pending.promise
                            : undefined;
                    },
                });
                const [first, second] = await fixture.query(popup);
                const checkbox = first.querySelector("input");
                assert.ok(checkbox, "Grouped and flat rows are selectable");
                checkbox.click();
                assert.equal(checkbox.checked, true);
                assert.equal(first.getAttribute("aria-checked"), "true");
                assert.equal(
                    first.classList.contains("search-popup-result--checked"),
                    true,
                );
                fixture.key(second, " ");
                assert.equal(second.getAttribute("aria-checked"), "true");
                const confirm = popup.overlay.querySelector(
                    ".search-popup-confirm-btn",
                );
                assert.match(confirm.textContent, /\(2\)/);
                confirm.dispatchEvent(
                    new MouseEvent("mousedown", { bubbles: true }),
                );
                assert.equal(
                    received.length,
                    0,
                    "Mousedown alone must not submit",
                );
                confirm.click();
                confirm.click();
                await wait();
                assert.deepEqual(received, [["one", "two"]]);
                assert.equal(confirm.disabled, true);
                checkbox.click();
                assert.equal(
                    checkbox.checked,
                    true,
                    "Pending selection cannot be changed through child checkbox",
                );
                pending.reject(new Error("callback failed"));
                for (
                    let attempt = 0;
                    attempt < 100 && !document.querySelector(".toast--error");
                    attempt += 1
                )
                    await wait(10);
                assert.ok(document.querySelector(".toast--error"));
                assert.equal(confirm.disabled, false);
                assert.match(confirm.textContent, /\(2\)/);
                assert.equal(popup.input.value, "Fixture");
                assert.equal(checkbox.checked, true);
                confirm.click();
                await wait(170);
                assert.deepEqual(received, [
                    ["one", "two"],
                    ["one", "two"],
                ]);
                assert.equal(popup.overlay.isConnected, false);
            },
        );
    }
    await context.test(
        "new results retain selections across a query and exclude detached result events",
        async () => {
            await fixture.reset();
            const popup = fixture.open({ multiSelect: true });
            const [old] = await fixture.query(popup);
            old.click();
            popup.input.value = "Second";
            popup.input.dispatchEvent(new Event("input", { bubbles: true }));
            await wait(350);
            const current = popup.overlay.querySelector(".search-popup-result");
            assert.notEqual(current, old);
            old.click();
            assert.equal(current.querySelector("input").checked, true);
            assert.equal(current.getAttribute("aria-checked"), "true");
            assert.match(
                popup.overlay.querySelector(".search-popup-confirm-btn")
                    .textContent,
                /\(1\)/,
            );
        },
    );
});

test("Search registered provider lifetimes survive filtering and identity replacement", async (context) => {
    const fixture = await selectionFixture(context);
    fixture.results.length = 0;
    const register = () =>
        fixture.registerSearchAvenue("fixture-provider", {
            id: "selection",
            categoryId: "Fixture",
            provider: () => ({
                category: "Fixture",
                items: [
                    {
                        id: "provided",
                        label: "Fixture provider",
                        url: "/provided",
                    },
                ],
            }),
        });
    let remove = register();
    context.after(() => remove());
    let calls = 0;
    let popup = fixture.open({
        onSelect: () => {
            calls += 1;
        },
    });
    let [row] = await fixture.query(popup);
    remove();
    row.click();
    for (
        let attempt = 0;
        attempt < 100 && !document.querySelector(".toast--info");
        attempt += 1
    )
        await wait(10);
    assert.equal(calls, 0);
    assert.ok(document.querySelector(".toast--info"));
    await fixture.reset();
    fixture.results.length = 0;
    const removeOld = register();
    remove = register();
    removeOld();
    const flow = await fixture.uiCtx.runFlow("search", { query: "Fixture" });
    assert.match(
        JSON.stringify(flow.stageResults["component-indexes"]),
        /Fixture provider/,
    );
    const pending = deferred();
    let callbackSignal;
    popup = fixture.open({
        onSelect: (_, { signal }) => {
            calls += 1;
            callbackSignal = signal;
            return pending.promise;
        },
    });
    [row] = await fixture.query(popup);
    row.click();
    await wait();
    assert.equal(calls, 1, "Stale disposer must retain the new provider");
    remove();
    assert.equal(callbackSignal.aborted, true);
    pending.reject(new Error("provider ended"));
    await wait(30);
    assert.equal(document.querySelectorAll(".toast").length, 0);
    assert.equal(
        popup.overlay.classList.contains("search-popup-overlay--closing"),
        false,
    );
});
