import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { skip, startFixture } from "./reuse/browser.js";

for (const mode of ["grid", "nested"]) {
    for (const [language, action] of [
        ["en", "done"],
        ["de", "shortcut"],
        ["id", "reset"],
        ["ja", "done"],
    ]) {
        test(
            `${mode} ${action} reports localized save failure and retry in ${language}`,
            { skip, timeout: 60000 },
            async (context) => {
                let failWrites = true;
                let writes = 0;
                const { browser } = await startFixture(
                    context,
                    `?mode=${mode}&lang=${language}`,
                    [390, 844],
                    {
                        async apiHandler(request, response) {
                            if (
                                request.method === "PUT" &&
                                request.url.includes("/preferences/responsive-")
                            ) {
                                writes++;
                                if (failWrites) {
                                    response.statusCode = 500;
                                    response.end(
                                        JSON.stringify({
                                            error: "fixture_failure",
                                        }),
                                    );
                                    return true;
                                }
                            }
                            return false;
                        },
                    },
                );
                const xml = readFileSync(
                    new URL(
                        `../../languages/${language}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                );
                const expectedSuccess = xml.match(
                    /<string name="ui\.reuse\.layout_saved">([^<]+)<\/string>/,
                )[1];
                const expectedFailure = xml.match(
                    /<string name="ui\.reuse\.layout_save_failed">([^<]+)<\/string>/,
                )[1];
                await browser.evaluate(
                    `document.querySelector('#composer-edit-toggle').click()`,
                );
                await browser.waitFor(
                    `Boolean(document.querySelector('.composer-cell'))`,
                );
                await browser.evaluate(
                    `document.querySelector('.composer-cell[data-composer-element="form"]').dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowUp', shiftKey:true, bubbles:true, cancelable:true}))`,
                );
                const pendingHeight = await browser.evaluate(
                    `document.querySelector('.composer-cell[data-composer-element="form"]').style.height`,
                );
                const click = () =>
                    browser.callFunction(
                        `function(action) { document.querySelector(action === 'shortcut' ? '#composer-edit-toggle' : action === 'reset' ? '.composer-reset-btn' : '.composer-done-btn').click(); }`,
                        [action],
                    );
                await click();
                await browser.waitFor(
                    `Array.from(document.querySelectorAll('.toast--error .toast-message')).some(element => element.textContent === ${JSON.stringify(expectedFailure)})`,
                );
                assert.equal(
                    await browser.evaluate(
                        `Array.from(document.querySelectorAll('.toast--error .toast-message')).at(-1).textContent`,
                    ),
                    expectedFailure,
                );
                assert.equal(
                    await browser.evaluate(
                        `Boolean(document.querySelector('.composer-cell'))`,
                    ),
                    true,
                    "Save failure keeps editing available",
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('.composer-cell[data-composer-element="form"]').style.height`,
                    ),
                    pendingHeight,
                    "Save failure keeps pending dimensions",
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('.content-grid').inert`,
                    ),
                    false,
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelectorAll('.toast--success').length`,
                    ),
                    0,
                    "Failure never emits success feedback",
                );
                failWrites = false;
                await click();
                await browser.waitFor(
                    `Array.from(document.querySelectorAll('.toast--success .toast-message')).some(element => element.textContent === ${JSON.stringify(expectedSuccess)})`,
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('.toast--success .toast-message').textContent`,
                    ),
                    expectedSuccess,
                );
                assert.equal(
                    writes,
                    2,
                    "One failed request and one retry reach persistence",
                );
                if (action !== "reset")
                    await browser.waitFor(
                        `!document.querySelector('.composer-cell')`,
                    );
                else
                    assert.ok(
                        await browser.evaluate(
                            `Boolean(document.querySelector('.composer-cell'))`,
                        ),
                        "Reset keeps the editor open",
                    );
                assert.equal(
                    browser.events.filter(
                        (event) => event.method === "Runtime.exceptionThrown",
                    ).length,
                    0,
                );
            },
        );
    }
}
