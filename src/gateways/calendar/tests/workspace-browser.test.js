import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { captureScreenshot } from "../../../ui/tests/integration/artifacts.js";
import {
    checkWorkspace,
    workspaceBrowserSkip,
} from "../../../ui/tests/integration/reuse/workspace.js";

test(
    "calendar has a usable populated workspace across devices",
    { skip: workspaceBrowserSkip, timeout: 120000 },
    async (context) => {
        await checkWorkspace(context, {
            fixtureDirectory: fileURLToPath(
                new URL("./fixtures/responsive", import.meta.url),
            ),
            staticRoots: {
                "/static/gateways/calendar/": fileURLToPath(
                    new URL("../", import.meta.url),
                ),
            },
            screenshotPrefix: "workspace-calendar",
            scrolling: "document",
            verifyViewport: async (browser, width) => {
                const availableWidth = await browser.evaluate(
                    `(()=>{const host=document.querySelector('[data-composer-element]');const style=getComputedStyle(host);return host.getBoundingClientRect().width-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);})()`,
                );
                assert.equal(
                    await browser.evaluate(
                        'Boolean(document.querySelector(".calendar-agenda"))',
                    ),
                    availableWidth <= 900,
                );
                if (width <= 640) {
                    assert.equal(
                        await browser.evaluate(
                            'document.querySelectorAll(".calendar-agenda-day").length',
                        ),
                        3,
                    );
                    assert.ok(
                        await browser.evaluate(
                            'document.querySelectorAll(".calendar-agenda [data-calendar-event]").length>=5',
                        ),
                    );
                }

                const canvas = await browser.evaluate(`(() => {
                    const canvas=document.querySelector('.calendar-view-canvas');
                    return {height:canvas.clientHeight,content:canvas.scrollHeight};
                })()`);
                assert.ok(
                    canvas.content <= canvas.height + 1,
                    JSON.stringify(canvas),
                );

                await browser.evaluate("window.fixture.composer.openToolbar()");
                await browser.evaluate(
                    "Promise.all(document.querySelector('.toolbar').getAnimations().map(animation => animation.finished))",
                );
                const sidebar = await browser.evaluate(`(() => {
                    const item=document.querySelector('.calendar-item-btn');const style=getComputedStyle(item);
                    const action=document.querySelector('.calendar-toolbar-add').getBoundingClientRect();
                    const probe=document.createElement('div');probe.style.background='var(--surface-soft)';item.append(probe);const selectedBackground=getComputedStyle(probe).backgroundColor;probe.remove();
                    const row=getComputedStyle(item.closest('li'));
                    return {background:style.backgroundColor,selectedBackground,border:style.borderTopWidth,rowBackground:row.backgroundColor,rowBorder:row.borderTopWidth,rowPadding:row.padding,itemHeight:item.getBoundingClientRect().height,actionHeight:action.height};
                })()`);
                assert.equal(sidebar.background, sidebar.selectedBackground);
                assert.equal(sidebar.border, "0px");
                assert.equal(sidebar.rowBackground, "rgba(0, 0, 0, 0)");
                assert.equal(sidebar.rowBorder, "0px");
                assert.equal(sidebar.rowPadding, "0px");
                assert.ok(sidebar.itemHeight >= 44);
                assert.ok(sidebar.actionHeight >= 44);
                const theme = await browser.evaluate(
                    "document.body.dataset.theme",
                );
                await captureScreenshot(
                    browser,
                    `calendar-sidebar-${theme}-${width}`,
                );
                await browser.evaluate(
                    "window.fixture.composer.closeToolbar()",
                );
            },
            afterMatrix: async (browser) => {
                await browser.resize(1920, 1080);
                await browser.waitFor(
                    '!document.querySelector(".calendar-agenda")',
                );
                await browser.evaluate(
                    'document.querySelector(".main-window").style.gridTemplateColumns="minmax(0,1fr) 420px"',
                );
                await browser.waitFor(
                    'Boolean(document.querySelector(".calendar-agenda"))',
                );
                assert.equal(
                    await browser.evaluate("innerWidth"),
                    1920,
                    "A narrow composer pane chooses its presentation without a viewport resize",
                );
                await browser.evaluate(
                    'document.querySelector(".main-window").style.gridTemplateColumns=""',
                );
                await browser.waitFor(
                    '!document.querySelector(".calendar-agenda")',
                );
                await browser.resize(390, 844);
                for (const [view, count] of [
                    ["day", 1],
                    ["week", 3],
                    ["month", 3],
                ]) {
                    await browser.callFunction(
                        `function(view){const select=document.querySelector('[data-calendar-view-select]');select.value=view;select.dispatchEvent(new Event('change',{bubbles:true}));}`,
                        [view],
                    );
                    assert.equal(
                        await browser.evaluate(
                            'document.querySelectorAll(".calendar-agenda-day").length',
                        ),
                        count,
                    );
                    assert.ok(
                        await browser.evaluate(
                            '[...document.querySelectorAll(".calendar-agenda [data-timeslot-add]")].every(button=>button.getBoundingClientRect().height>=44)',
                        ),
                    );
                }
                for (const [width, height] of [
                    [390, 844],
                    [844, 390],
                    [1440, 900],
                    [1819, 463],
                ]) {
                    await browser.resize(width, height);
                    for (const view of ["day", "week", "month", "year"]) {
                        await browser.callFunction(
                            `function(view){const select=document.querySelector('[data-calendar-view-select]');select.value=view;select.dispatchEvent(new Event('change',{bubbles:true}));}`,
                            [view],
                        );
                        const geometry = await browser.evaluate(`(() => {
                            const canvas=document.querySelector('.calendar-view-canvas');
                            const card=document.querySelector('[data-composer-element]');
                            const timed=document.querySelector('[data-calendar-week-scroll-grid], .calendar-day-timed-grid');
                            return {canvas:canvas.getBoundingClientRect().toJSON(),card:card.getBoundingClientRect().toJSON(),content:canvas.scrollHeight,height:canvas.clientHeight,timed:timed ? {height:timed.clientHeight,content:timed.scrollHeight}:null,page:document.scrollingElement.scrollHeight};
                        })()`);
                        assert.ok(
                            geometry.content <= geometry.height + 1,
                            JSON.stringify({ width, height, view, geometry }),
                        );
                        assert.ok(
                            geometry.canvas.bottom <= geometry.card.bottom + 1,
                            JSON.stringify(geometry),
                        );
                        if (geometry.timed) {
                            assert.ok(
                                geometry.timed.content <=
                                    geometry.timed.height + 1,
                                JSON.stringify(geometry),
                            );
                            assert.ok(
                                geometry.card.height > height,
                                "The complete timed view grows past the viewport",
                            );
                        }
                        await browser.evaluate(
                            "scrollTo(0, document.scrollingElement.scrollHeight)",
                        );
                        await browser.evaluate(
                            "new Promise(resolve=>requestAnimationFrame(resolve))",
                        );
                        assert.ok(
                            await browser.evaluate(
                                `document.querySelector('.calendar-view-canvas').getBoundingClientRect().bottom <= document.querySelector('.global-footer').getBoundingClientRect().top + 1`,
                            ),
                            "The end of the calendar is reachable above the footer",
                        );
                        await captureScreenshot(
                            browser,
                            `calendar-document-${view}-${width}-${height}`,
                        );
                        await browser.evaluate("scrollTo(0,0)");
                    }
                }
                const readonly = await browser.evaluate(
                    `(async()=>{const{renderCalendarView}=await import('/static/gateways/calendar/ui/calendar-ui-helpers.js');const{data,i18n}=window.fixture;const host=document.createElement('div');host.innerHTML=renderCalendarView(data.events,'month',new Date(data.date),i18n,null,{compact:true,canCreate:false});return{events:new Set([...host.querySelectorAll('[data-calendar-event]')].map(button=>button.dataset.calendarEvent)).size,create:host.querySelectorAll('[data-timeslot-add]').length};})()`,
                );
                assert.deepEqual(
                    readonly,
                    { events: 7, create: 0 },
                    "Read-only calendars retain events without offering writes",
                );
            },
        });
    },
);
