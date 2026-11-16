import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { serveBrowserFixture } from "./fixture-server.js";
import { launchChromium, findChromium } from "./chromium.js";
import { captureScreenshot } from "./artifacts.js";
const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;
async function pressEnter(browser) {
    const key = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
    await browser.command("Input.dispatchKeyEvent", {
        type: "keyDown",
        text: "\r",
        ...key,
    });
    await browser.command("Input.dispatchKeyEvent", { type: "keyUp", ...key });
}

const sizes = [
    [253, 600],
    [320, 568],
    [390, 844],
    [568, 320],
    [844, 390],
    [768, 1024],
    [1024, 768],
    [1440, 900],
    [1920, 1080],
];
for (const mode of ["calendar", "messages"])
    test(
        `${mode} has a usable populated workspace across devices`,
        { skip: !executable, timeout: 120000 },
        async (context) => {
            const server = await serveBrowserFixture(
                fileURLToPath(
                    new URL("./fixtures/device-pages", import.meta.url),
                ),
                {
                    staticRoots: {
                        "/static/gateways/calendar/": fileURLToPath(
                            new URL(
                                "../../../gateways/calendar/",
                                import.meta.url,
                            ),
                        ),
                    },
                },
            );
            context.after(() => server.close());
            const browser = await launchChromium(executable);
            context.after(() => browser.close());
            await browser.command("Page.navigate", {
                url: server.url + "/?mode=" + mode,
            });
            await browser.waitFor("window.fixtureReady===true", {
                timeoutMs: 20000,
            });
            await browser.waitFor(
                `(async()=>{const {uiCtx}=await import('/static/reuse/ui-ctx.js');return uiCtx.capabilities.get('ui:pageReadiness').isReady();})()`,
                { timeoutMs: 20000 },
            );
            await browser.evaluate("document.fonts.ready");
            await browser.command("Emulation.setTouchEmulationEnabled", {
                enabled: true,
                maxTouchPoints: 1,
            });
            if (mode === "messages")
                await browser.evaluate(
                    `(()=>{const input=document.querySelector('.messages-composer-input');window.originalMessageInput=input;input.value='Draft survives orientation changes';input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
                );
            for (const [width, height] of sizes)
                await context.test(`${width}x${height}`, async () => {
                    await browser.resize(width, height);
                    const state = await browser.evaluate(
                        `({width:document.documentElement.scrollWidth,viewport:innerWidth,main:document.querySelector('.main-window').getBoundingClientRect().toJSON(),footer:document.querySelector('.global-footer').getBoundingClientRect().toJSON(),card:document.querySelector('[data-composer-element]').getBoundingClientRect().toJSON()})`,
                    );
                    assert.ok(state.width <= width + 1, JSON.stringify(state));
                    assert.ok(state.main.height > 0);
                    if (height >= 480)
                        assert.ok(
                            state.main.bottom <= height + 1,
                            JSON.stringify(state),
                        );
                    else
                        assert.ok(
                            state.main.height >= 256,
                            "Short screens retain a scrollable usable workspace",
                        );
                    assert.ok(
                        state.card.bottom <= state.main.bottom + 1,
                        JSON.stringify(state),
                    );
                    if (mode === "calendar") {
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
                    } else {
                        if (width <= 900) {
                            const picker = await browser.evaluate(
                                `(()=>{const rect=document.querySelector('.messages-room-picker').getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`,
                            );
                            await browser.command("Input.dispatchTouchEvent", {
                                type: "touchStart",
                                touchPoints: [picker],
                            });
                            await browser.command("Input.dispatchTouchEvent", {
                                type: "touchEnd",
                                touchPoints: [],
                            });
                            await browser.waitFor(
                                'document.querySelector(".toolbar").classList.contains("toolbar--mobile-open")',
                            );
                            await browser.command("Input.dispatchKeyEvent", {
                                type: "keyDown",
                                key: "Escape",
                                code: "Escape",
                                windowsVirtualKeyCode: 27,
                            });
                            assert.equal(
                                await browser.evaluate(
                                    'document.activeElement.classList.contains("messages-room-picker")',
                                ),
                                true,
                            );
                        }
                        assert.equal(
                            await browser.evaluate(
                                'document.querySelector(".messages-composer-input") === window.originalMessageInput',
                            ),
                            true,
                            "Stateful message controls retain their nodes",
                        );
                        assert.equal(
                            await browser.evaluate(
                                'document.querySelector(".messages-composer-input").value',
                            ),
                            "Draft survives orientation changes",
                        );
                    }
                    await captureScreenshot(
                        browser,
                        `workspace-${mode}-${width}-${height}`,
                    );
                });
            if (mode === "messages")
                assert.equal(
                    await browser.evaluate("window.fixture.mounted"),
                    1,
                    "Viewport changes do not rebind stateful controls",
                );
            if (mode === "calendar") {
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
            }
            await browser.resize(390, 844);
            if (mode === "calendar") {
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
                const readonly = await browser.evaluate(
                    `(async()=>{const{renderCalendarView}=await import('/static/gateways/calendar/ui/calendar-ui-helpers.js');const{data,i18n}=window.fixture;const host=document.createElement('div');host.innerHTML=renderCalendarView(data.events,'month',new Date(data.date),i18n,null,{compact:true,canCreate:false});return{events:new Set([...host.querySelectorAll('[data-calendar-event]')].map(button=>button.dataset.calendarEvent)).size,create:host.querySelectorAll('[data-timeslot-add]').length};})()`,
                );
                assert.deepEqual(
                    readonly,
                    { events: 7, create: 0 },
                    "Read-only calendars retain events without offering writes",
                );
            } else {
                await browser.evaluate(
                    'document.querySelector(".messages-room-picker").focus()',
                );
                await pressEnter(browser);
                await browser.waitFor(
                    'document.querySelector(".toolbar").classList.contains("toolbar--mobile-open")',
                );
                await browser.evaluate(
                    'document.querySelector(".messages-room-select").focus()',
                );
                await pressEnter(browser);
                await browser.waitFor(
                    '!document.querySelector(".toolbar").classList.contains("toolbar--mobile-open")',
                );
                const fullHeight = await browser.evaluate(
                    'document.querySelector(".main-window").getBoundingClientRect().height',
                );
                await browser.command("Emulation.setPageScaleFactor", {
                    pageScaleFactor: 2,
                });
                await browser.waitFor("visualViewport.scale>1");
                await browser.evaluate(
                    "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
                );
                assert.ok(
                    (await browser.evaluate(
                        'document.querySelector(".main-window").getBoundingClientRect().height',
                    )) < fullHeight,
                    "Visual viewport changes resize the workspace",
                );
                await browser.command("Emulation.setPageScaleFactor", {
                    pageScaleFactor: 1,
                });
            }
            await browser.resize(320, 568);
            await browser.evaluate(
                'document.documentElement.style.fontSize="24px"',
            );
            await browser.evaluate(
                "new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))",
            );
            assert.ok(
                await browser.evaluate(
                    "document.documentElement.scrollWidth<=innerWidth+1",
                ),
                "Enlarged text fits the content column",
            );
            await browser.evaluate("window.fixture.composer.destroy()");
            assert.equal(
                await browser.evaluate(
                    'document.querySelector(".workspace").style.getPropertyValue("--page-viewport-height")',
                ),
                "",
            );
        },
    );
