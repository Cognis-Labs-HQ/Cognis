import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
    checkWorkspace,
    workspaceBrowserSkip,
    pressEnter,
} from "../../../../ui/tests/integration/reuse/workspace.js";

test(
    "messages has a usable populated workspace across devices",
    { skip: workspaceBrowserSkip, timeout: 120000 },
    async (context) => {
        await checkWorkspace(context, {
            fixtureDirectory: fileURLToPath(
                new URL("./fixtures/responsive", import.meta.url),
            ),
            staticRoots: {
                "/static/adapters/social/messages/": fileURLToPath(
                    new URL("../ui/", import.meta.url),
                ),
            },
            screenshotPrefix: "workspace-messages",
            setup: async (browser) => {
                await browser.evaluate(
                    `(()=>{const input=document.querySelector('.messages-composer-input');window.originalMessageInput=input;input.value='Draft survives orientation changes';input.dispatchEvent(new Event('input',{bubbles:true}));})()`,
                );
            },
            verifyViewport: async (browser, width) => {
                const sidebarTheme = await browser.evaluate(`(() => {
                    const room = getComputedStyle(document.querySelector('.messages-room-select'));
                    const action = getComputedStyle(document.querySelector('.messages-new-btn'));
                    const probe = document.createElement('div');
                    probe.style.cssText = 'border-color:var(--text);color:var(--text);background:var(--surface-soft)';
                    document.querySelector('.app-shell').append(probe);
                    const expected = getComputedStyle(probe);
                    const result = {roomBorder:room.borderTopWidth,roomBackground:room.backgroundColor,actionBorder:action.borderTopWidth,actionColor:action.color,expectedBorder:expected.borderTopColor,expectedColor:expected.color,expectedBackground:expected.backgroundColor,roomParentBackground:getComputedStyle(document.querySelector('.messages-room')).backgroundColor};
                    probe.remove();return result;
                })()`);
                assert.equal(sidebarTheme.roomBorder, "0px");
                assert.equal(
                    sidebarTheme.roomBackground,
                    sidebarTheme.expectedBackground,
                );
                assert.equal(
                    sidebarTheme.roomParentBackground,
                    "rgba(0, 0, 0, 0)",
                );
                assert.equal(sidebarTheme.actionBorder, "0px");
                assert.equal(
                    sidebarTheme.actionColor,
                    sidebarTheme.expectedColor,
                );
                if (width <= 900) {
                    const picker = await browser.evaluate(
                        `(()=>{const rect=document.querySelector('.toolbar-mobile-toggle').getBoundingClientRect();return{x:rect.left+rect.width/2,y:rect.top+rect.height/2};})()`,
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
                            'document.activeElement.classList.contains("toolbar-mobile-toggle")',
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
            },
            afterMatrix: async (browser) => {
                assert.equal(
                    await browser.evaluate("window.fixture.mounted"),
                    1,
                    "Viewport changes do not rebind stateful controls",
                );
                await browser.resize(390, 844);
                await browser.evaluate(
                    'document.querySelector(".toolbar-mobile-toggle").focus()',
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
            },
        });
    },
);
