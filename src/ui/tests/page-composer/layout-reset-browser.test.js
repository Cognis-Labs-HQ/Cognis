import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";
import { settleEditor } from "./reuse/editor-pointer.js";

for (const mode of ["grid", "nested"]) {
    for (const viewport of [
        [1440, 900],
        [390, 844],
    ]) {
        for (const decision of ["done", "discard"]) {
            test(
                `${mode} ${viewport[0]}px reset stages defaults until ${decision}`,
                { skip, timeout: 60000 },
                async (context) => {
                    const key =
                        mode === "nested"
                            ? "responsive-nested-grid"
                            : "responsive-grid";
                    const prior = {
                        placements: [
                            { id: "form", col: 0, row: 2, w: 2, h: 3 },
                        ],
                        hidden: ["content"],
                    };
                    let saved = {
                        layoutsByGrid: Object.fromEntries(
                            Array.from({ length: 24 }, (_, index) => [
                                `cols-${index + 1}`,
                                prior,
                            ]),
                        ),
                    };
                    const original = structuredClone(saved);
                    let writes = 0;
                    const { browser } = await startFixture(
                        context,
                        `?mode=${mode}&scenario=feedback`,
                        viewport,
                        {
                            async apiHandler(request, response, url) {
                                if (
                                    !url.pathname.endsWith(
                                        `/preferences/${key}`,
                                    )
                                )
                                    return false;
                                if (request.method === "PUT") {
                                    writes++;
                                    let body = "";
                                    for await (const chunk of request)
                                        body += chunk;
                                    saved = JSON.parse(body).layout;
                                }
                                response.end(
                                    JSON.stringify({
                                        data: {
                                            layoutJson: JSON.stringify(saved),
                                        },
                                    }),
                                );
                                return true;
                            },
                        },
                        1,
                    );
                    await click(browser, "#composer-edit-toggle");
                    const before = await positions(browser);
                    assert.equal(before.length, 1);
                    await click(browser, ".composer-reset-btn");
                    const defaults = await positions(browser);
                    assert.equal(
                        defaults.length,
                        2,
                        "Reset reveals elements hidden in the saved layout",
                    );
                    assert.notDeepEqual(defaults, before);
                    await click(browser, ".composer-reset-btn");
                    assert.deepEqual(
                        await positions(browser),
                        defaults,
                        "Repeated resets stage the same defaults",
                    );
                    assert.equal(writes, 0, "Reset never writes preferences");
                    assert.deepEqual(saved, original);
                    assert.equal(
                        await browser.evaluate(
                            "document.querySelectorAll('.toast--success, .toast--error').length",
                        ),
                        0,
                        "Staging does not report a save result",
                    );
                    await click(browser, `.composer-${decision}-btn`);
                    await browser.waitFor(
                        "!document.querySelector('.composer-cell')",
                    );
                    assert.equal(writes, decision === "done" ? 1 : 0);
                    if (decision === "discard")
                        assert.deepEqual(saved, original);
                    else assert.notDeepEqual(saved, original);
                    await click(browser, "#composer-edit-toggle");
                    assert.deepEqual(
                        await positions(browser),
                        decision === "done" ? defaults : before,
                        "Reopening uses the committed layout",
                    );
                    assert.equal(
                        browser.events.filter(
                            (event) =>
                                event.method === "Runtime.exceptionThrown",
                        ).length,
                        0,
                    );
                },
            );
        }
    }
}

async function click(browser, selector) {
    await browser.callFunction(
        `function(selector) { document.querySelector(selector).click(); }`,
        [selector],
    );
    await settleEditor(browser);
}

async function positions(browser) {
    await settleEditor(browser);
    return browser.evaluate(
        `Array.from(document.querySelectorAll('.composer-cell'), cell => ({ id: cell.dataset.composerElement, left: cell.style.left, top: cell.style.top, width: cell.style.width, height: cell.style.height }))`,
    );
}
