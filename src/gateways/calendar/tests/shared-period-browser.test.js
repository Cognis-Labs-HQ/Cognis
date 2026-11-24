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
    "Calendar shared and account grids preserve periods, drill-down and responsive layout",
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
            [
                "week",
                month +
                    " · " +
                    (await browser.evaluate(
                        "window.fixture.i18n.t('gateway.calendar.week_number_prefix')",
                    )) +
                    "19",
            ],
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
                const geometry = await browser.evaluate(`(() => {
                    const section = document.querySelector('.shared-calendar');
                    const header = section.querySelector('.calendar-view-header').getBoundingClientRect();
                    const canvas = section.querySelector('.calendar-view-canvas').getBoundingClientRect();
                    return { headerHeight: header.height, overlap: header.bottom - canvas.top,
                        styles: [...document.querySelectorAll('link[rel=stylesheet]')].some(link => link.href.includes('share-renderer.css')) };
                })()`);
                assert.equal(geometry.styles, true);
                assert.ok(
                    geometry.headerHeight >= 40,
                    JSON.stringify(geometry),
                );
                assert.ok(geometry.overlap <= 1, JSON.stringify(geometry));
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
        const verifyDrillDown = async () => {
            await browser.resize(1440, 900);
            await browser.evaluate(`(() => {
                const date = document.querySelector('[data-calendar-date]');
                date.value = '2032-05-06';
                date.dispatchEvent(new Event('change', { bubbles: true }));
                const select = document.querySelector('[data-calendar-view-select]');
                select.value = 'year';
                select.dispatchEvent(new Event('change', { bubbles: true }));
                document.querySelector('[data-year-month-index="1"]').click();
            })()`);
            assert.equal(
                await browser.evaluate(
                    "document.querySelector('[data-calendar-view-select]').value",
                ),
                "month",
            );
            assert.equal(
                await browser.evaluate(
                    "document.querySelector('[data-calendar-date]').value",
                ),
                "2032-02-01",
            );
            assert.equal(
                await browser.evaluate(
                    "getComputedStyle(document.querySelector('.calendar-week-jump')).writingMode",
                ),
                "horizontal-tb",
            );
            await browser.evaluate(
                "document.querySelector('.calendar-week-number').style.width = '2rem'",
            );
            await browser.waitFor(
                "getComputedStyle(document.querySelector('.calendar-week-jump')).writingMode === 'vertical-rl'",
            );
            await browser.evaluate(
                "document.querySelector('.calendar-week-number').style.width = ''",
            );
            await browser.waitFor(
                "getComputedStyle(document.querySelector('.calendar-week-jump')).writingMode === 'horizontal-tb'",
            );
            for (const [selector, view, attribute] of [
                ["[data-week-row-date]", "week", "data-week-row-date"],
                ["[data-day-dot-date]", "day", "data-day-dot-date"],
            ]) {
                const expectedDate = await browser.callFunction(
                    `function(selector, attribute) {
                    const button = document.querySelector(selector);
                    const date = new Date(button.getAttribute(attribute));
                    const value = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
                    button.click();
                    return value;
                }`,
                    [selector, attribute],
                );
                assert.equal(
                    await browser.evaluate(
                        "document.querySelector('[data-calendar-view-select]').value",
                    ),
                    view,
                );
                assert.equal(
                    await browser.evaluate(
                        "document.querySelector('[data-calendar-date]').value",
                    ),
                    expectedDate,
                );
            }
        };
        const verifyCurrentPeriod = async () => {
            for (const [width, height] of [
                [390, 844],
                [768, 1024],
                [1440, 900],
            ]) {
                await browser.resize(width, height);
                for (const view of ["day", "week", "month", "year"]) {
                    const state = await browser.callFunction(
                        `function(view) {
                        const input = document.querySelector('[data-calendar-date]');
                        input.value = '2032-05-06';
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        const select = document.querySelector('[data-calendar-view-select]');
                        select.value = view;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        const button = document.querySelector('[data-calendar-nav="today"]');
                        const compact = button.closest('[data-composer-layout]').dataset.composerLayout !== 'regular';
                        const label = window.fixture.i18n.t('gateway.calendar.' + (compact || view === 'day' ? 'today' : 'this_' + view));
                        return {text:button.textContent, title:button.title, aria:button.getAttribute('aria-label'), label};
                    }`,
                        [view],
                    );
                    assert.equal(state.text, state.label);
                    assert.equal(state.title, state.label);
                    assert.equal(state.aria, state.label);
                    await browser.evaluate(
                        "document.querySelector('[data-calendar-nav=today]').click()",
                    );
                    assert.equal(
                        await browser.evaluate(
                            "document.querySelector('[data-calendar-view-select]').value",
                        ),
                        view,
                    );
                    assert.equal(
                        await browser.evaluate(
                            "document.querySelector('[data-calendar-date]').value",
                        ),
                        await browser.evaluate(
                            "(()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')})()",
                        ),
                    );
                }
            }
        };
        await verifyDrillDown();
        await verifyCurrentPeriod();
        await browser.evaluate("window.fixture.lifetime.abort()");
        assert.equal(
            await browser.evaluate(
                "document.querySelector('.workspace').style.getPropertyValue('--page-viewport-height')",
            ),
            "",
        );
        await browser.command("Page.navigate", { url: server.url });
        await browser.waitFor(
            "window.fixtureReady === true && !document.querySelector('.shared-calendar')",
        );
        await verifyDrillDown();
        await verifyCurrentPeriod();
        await browser.evaluate("window.fixture.lifetime.abort()");
    },
);
