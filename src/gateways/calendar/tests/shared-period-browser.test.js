import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { serveBrowserFixture } from "../../../ui/tests/integration/fixture-server.js";
import {
    launchChromium,
    findChromium,
} from "../../../ui/tests/integration/chromium.js";

const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;

test(
    "shared Calendar keeps its selected period heading through responsive redraws",
    { skip: !executable, timeout: 60000 },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/responsive", import.meta.url)),
            {
                staticRoots: {
                    "/static/gateways/calendar/": fileURLToPath(
                        new URL("../", import.meta.url),
                    ),
                },
            },
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", { url: server.url + "?shared" });
        await browser.waitFor("window.fixtureReady===true", {
            timeoutMs: 20000,
        });
        await browser.resize(1440, 900);
        await browser.evaluate(
            `(()=>{const date=document.querySelector('[data-calendar-date]');date.value='2032-05-06';date.dispatchEvent(new Event('change',{bubbles:true}));})()`,
        );
        const month = await browser.evaluate(
            "(async()=>{const {formatMonthYear}=await import('/static/reuse/timestamp.js');return formatMonthYear(new Date(2032,4,6));})()",
        );
        for (const [view, expected] of [
            ["day", month],
            ["week", month],
            ["month", month],
            ["year", "2032"],
        ]) {
            await browser.callFunction(
                `function(view){if(view==='day'){document.querySelector('[data-calendar-view="day"]').click();return;}const select=document.querySelector('[data-calendar-view-select]');select.value=view;select.dispatchEvent(new Event('change',{bubbles:true}));}`,
                [view],
            );
            const assertSelection = async () => {
                const selections = await browser.evaluate(
                    "[...document.querySelectorAll('[data-calendar-view]')].map(button=>({view:button.dataset.calendarView,active:button.classList.contains('active'),pressed:button.getAttribute('aria-pressed'),neutral:button.classList.contains('btn-neutral')}))",
                );
                assert.equal(
                    selections.filter((button) => button.pressed === "true")
                        .length,
                    1,
                );
                for (const button of selections) {
                    assert.equal(button.neutral, true);
                    assert.equal(button.active, button.view === view);
                    assert.equal(button.pressed, String(button.view === view));
                }
            };
            await assertSelection();
            for (const [width, height] of [
                [390, 844],
                [768, 1024],
                [1440, 900],
                [390, 844],
            ]) {
                await browser.resize(width, height);
                await assertSelection();
                assert.equal(
                    await browser.evaluate(
                        "document.querySelector('.calendar-nav-month-label').textContent",
                    ),
                    expected,
                );
                assert.equal(
                    await browser.evaluate(
                        "document.querySelector('[data-calendar-date]').value",
                    ),
                    "2032-05-06",
                );
                assert.equal(
                    await browser.evaluate(
                        "document.querySelector('[data-calendar-view-select]').value",
                    ),
                    view,
                );
            }
        }
        await browser.evaluate("window.fixture.lifetime.abort()");
        assert.equal(
            await browser.evaluate(
                "document.querySelector('.workspace').style.getPropertyValue('--page-viewport-height')",
            ),
            "",
        );
    },
);
