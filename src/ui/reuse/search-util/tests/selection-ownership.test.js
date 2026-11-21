import assert from "node:assert/strict";
import test from "node:test";
import { deferred, selectionFixture, wait } from "./selection-fixture.js";

test("Search selection owns callback outcomes through its registered flow", async (context) => {
    const fixture = await selectionFixture(context);
    let flowRuns = 0;
    fixture.uiCtx.extendFlow(
        "ui:searchSelection",
        "before",
        { id: "fixture:observe" },
        () => {
            flowRuns += 1;
        },
    );
    context.after(() =>
        fixture.uiCtx.removeFlowHook(
            "ui:searchSelection",
            "before",
            "fixture:observe",
        ),
    );

    for (const navbar of [false, true]) {
        for (const activation of ["click", "Enter", " "]) {
            await context.test(
                `${navbar ? "navbar" : "direct"} ${activation} awaits once and locks the query`,
                async () => {
                    await fixture.reset();
                    const pending = deferred();
                    let calls = 0;
                    const popup = fixture.open(
                        {
                            onSelect: () => {
                                calls += 1;
                                return pending.promise;
                            },
                        },
                        navbar,
                    );
                    const [row] = await fixture.query(popup);
                    const activate = () =>
                        activation === "click"
                            ? row.click()
                            : fixture.key(row, activation);
                    activate();
                    activate();
                    await wait();
                    assert.equal(calls, 1);
                    assert.equal(
                        popup.overlay.classList.contains(
                            "search-popup-overlay--closing",
                        ),
                        false,
                    );
                    assert.equal(
                        popup.overlay.getAttribute("aria-busy"),
                        "true",
                    );
                    assert.equal(popup.input.disabled, true);
                    popup.input.value = "Changed";
                    popup.input.dispatchEvent(
                        new Event("input", { bubbles: true }),
                    );
                    assert.equal(popup.input.value, "Fixture");
                    pending.resolve();
                    await wait(170);
                    assert.equal(popup.overlay.isConnected, false);
                },
            );
        }
        for (const synchronous of [false, true]) {
            await context.test(
                `${navbar ? "navbar" : "direct"} ${synchronous ? "throw" : "reject"} retains state and permits an explicit retry`,
                async () => {
                    await fixture.reset();
                    let calls = 0;
                    const popup = fixture.open(
                        {
                            onSelect: () => {
                                calls += 1;
                                if (calls > 1) return;
                                if (synchronous)
                                    throw new Error(
                                        "private-selection-details",
                                    );
                                return Promise.reject(
                                    new Error("private-selection-details"),
                                );
                            },
                        },
                        navbar,
                    );
                    const [row] = await fixture.query(popup);
                    row.click();
                    for (
                        let attempt = 0;
                        attempt < 100 &&
                        !document.querySelector(".toast--error");
                        attempt += 1
                    )
                        await wait(10);
                    assert.ok(document.querySelector(".toast--error"));
                    assert.equal(
                        popup.overlay.classList.contains(
                            "search-popup-overlay--closing",
                        ),
                        false,
                    );
                    assert.equal(popup.input.value, "Fixture");
                    assert.equal(popup.input.disabled, false);
                    assert.equal(calls, 1);
                    assert.doesNotMatch(
                        JSON.stringify(fixture.logs),
                        /private-selection-details/,
                    );
                    row.click();
                    await wait(170);
                    assert.equal(calls, 2);
                    assert.equal(popup.overlay.isConnected, false);
                },
            );
        }
        await context.test(
            `${navbar ? "navbar" : "direct"} false keeps Search open without an error`,
            async () => {
                await fixture.reset();
                const popup = fixture.open({ onSelect: () => false }, navbar);
                (await fixture.query(popup))[0].click();
                await wait(170);
                assert.equal(
                    popup.overlay.classList.contains(
                        "search-popup-overlay--closing",
                    ),
                    false,
                );
                assert.equal(
                    document.querySelectorAll(".toast--error").length,
                    0,
                );
                assert.equal(popup.input.disabled, false);
            },
        );
    }
    await context.test(
        "missing optional callbacks complete without throwing",
        async () => {
            await fixture.reset();
            const popup = fixture.open({}, true);
            (await fixture.query(popup))[0].click();
            await wait(170);
            assert.equal(popup.overlay.isConnected, false);
        },
    );
    await context.test(
        "old navbar close completion cannot clear a newer opening",
        async () => {
            await fixture.reset();
            const popup = fixture.open({}, true);
            popup.toggle.click();
            popup.toggle.click();
            const current = document.querySelector(
                ".search-popup-overlay:not(.search-popup-overlay--closing)",
            );
            await wait(170);
            popup.toggle.click();
            assert.equal(
                current.classList.contains("search-popup-overlay--closing"),
                true,
            );
            assert.equal(
                document.querySelectorAll(
                    ".search-popup-overlay:not(.search-popup-overlay--closing)",
                ).length,
                0,
            );
        },
    );
    await context.test(
        "find shortcut ignores closing surfaces and detached navbar controls",
        async () => {
            await fixture.reset();
            const popup = fixture.open({}, true);
            popup.toggle.click();
            popup.toggle.click();
            const active = document.querySelector(
                ".search-popup-overlay:not(.search-popup-overlay--closing)",
            );
            document.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "f",
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            assert.equal(document.activeElement, active.querySelector("input"));
            active.__closeSearchPopup();
            popup.toggle.closest(".search-bar-wrap").remove();
            document.dispatchEvent(
                new KeyboardEvent("keydown", {
                    key: "f",
                    ctrlKey: true,
                    bubbles: true,
                    cancelable: true,
                }),
            );
            assert.equal(
                document.querySelectorAll(
                    ".search-popup-overlay:not(.search-popup-overlay--closing)",
                ).length,
                0,
            );
        },
    );
    for (const cancellation of [
        "close",
        "Escape",
        "route",
        "pagehide",
        "signal",
        "account",
        "replacement",
    ]) {
        await context.test(
            `${cancellation} invalidates pending callbacks without stale feedback`,
            async () => {
                await fixture.reset();
                const pending = deferred();
                const lifetime = new AbortController();
                let callbackSignal;
                const popup = fixture.open({
                    signal: lifetime.signal,
                    onSelect: (_, { signal }) => {
                        callbackSignal = signal;
                        return pending.promise;
                    },
                });
                (await fixture.query(popup))[0].click();
                await wait();
                let replacement;
                if (cancellation === "close") popup.close();
                if (cancellation === "Escape") fixture.key(document, "Escape");
                if (cancellation === "route")
                    window.dispatchEvent(new Event("cognis:route-will-change"));
                if (cancellation === "pagehide")
                    window.dispatchEvent(new Event("pagehide"));
                if (cancellation === "signal") lifetime.abort();
                if (cancellation === "account")
                    localStorage.setItem("cognis_account", "changed");
                if (cancellation === "replacement")
                    replacement = fixture.open();
                pending.reject(new Error("old selection rejected"));
                await wait(170);
                assert.equal(document.querySelectorAll(".toast").length, 0);
                assert.equal(callbackSignal.aborted, true);
                assert.equal(popup.overlay.isConnected, false);
                if (replacement)
                    assert.equal(
                        replacement.overlay.classList.contains(
                            "search-popup-overlay--closing",
                        ),
                        false,
                    );
            },
        );
    }
    for (const key of ["cognis_account", "cognis_access_token"]) {
        await context.test(
            `${key} changes before selection dismiss only the expired Search`,
            async () => {
                await fixture.reset();
                let calls = 0;
                const popup = fixture.open({
                    onSelect: () => {
                        calls += 1;
                    },
                });
                const [row] = await fixture.query(popup);
                localStorage.setItem(key, "fixture-changed-identity");
                row.click();
                const next = fixture.open();
                await wait(170);
                assert.equal(calls, 0);
                assert.equal(popup.overlay.isConnected, false);
                assert.equal(
                    next.overlay.classList.contains(
                        "search-popup-overlay--closing",
                    ),
                    false,
                );
                assert.equal(next.input.disabled, false);
                assert.equal(document.querySelectorAll(".toast").length, 0);
            },
        );
    }
    await context.test(
        "old-account settlement cannot dismiss a replacement opened for the new account",
        async () => {
            await fixture.reset();
            const pending = deferred();
            const popup = fixture.open({ onSelect: () => pending.promise });
            (await fixture.query(popup))[0].click();
            await wait();
            localStorage.setItem("cognis_account", "fixture-next-account");
            const next = fixture.open();
            pending.reject(new Error("old-account outcome"));
            await wait(170);
            assert.equal(popup.overlay.isConnected, false);
            assert.equal(
                next.overlay.classList.contains(
                    "search-popup-overlay--closing",
                ),
                false,
            );
            assert.equal(next.input.disabled, false);
            assert.equal(document.querySelectorAll(".toast").length, 0);
        },
    );
    await context.test(
        "the public selection helper permits independent calls with a reused close callback",
        async () => {
            await fixture.reset();
            const { selectSearchResult } = await import("../results.js");
            const selected = [];
            let closes = 0;
            const close = () => {
                closes += 1;
            };
            const onSelect = (item) => {
                selected.push(item.id);
            };
            assert.equal(
                await selectSearchResult({ id: "first" }, onSelect, close),
                true,
            );
            assert.equal(
                await selectSearchResult({ id: "second" }, onSelect, close),
                true,
            );
            assert.deepEqual(selected, ["first", "second"]);
            assert.equal(closes, 2);
            const pending = deferred();
            const first = selectSearchResult(
                { id: "pending" },
                () => {
                    selected.push("pending");
                    return pending.promise;
                },
                close,
            );
            assert.equal(
                await selectSearchResult({ id: "duplicate" }, onSelect, close),
                false,
            );
            pending.resolve();
            assert.equal(await first, true);
            assert.deepEqual(selected, ["first", "second", "pending"]);
            assert.equal(closes, 3);
        },
    );
    assert.ok(flowRuns >= 20, "Actual selection flow hooks execute");
});
