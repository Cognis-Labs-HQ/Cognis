import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";
import { captureScreenshot } from "../integration/artifacts.js";

test(
    "page navigation retains upstream appearance and sidebar choices remain menu entries",
    { skip, timeout: 60000 },
    async (context) => {
        const { browser } = await startFixture(context, "?menus");
        for (const [width, height] of [
            [253, 600],
            [390, 844],
            [768, 1024],
            [1440, 900],
            [1920, 1080],
        ]) {
            await context.test(`${width}x${height}`, async () => {
                await browser.resize(width, height);
                const appearance = await browser.evaluate(`(() => {
                    const link = document.querySelector('[data-fixture-nav]');
                    const read = () => {const style = getComputedStyle(link); return {
                        radius: style.borderRadius, padding: style.padding,
                        border: style.borderTopWidth, weight: style.fontWeight,
                        size: Number.parseFloat(style.fontSize), background: style.backgroundColor
                    }};
                    const resting = read();
                    link.classList.add('active');
                    const active = read();
                    link.classList.remove('active');
                    return {resting, active, rootSize: Number.parseFloat(getComputedStyle(document.documentElement).fontSize)};
                })()`);
                assert.equal(appearance.resting.radius, "10px");
                assert.equal(appearance.resting.padding, "7px 12px");
                assert.equal(appearance.resting.border, "1px");
                assert.equal(appearance.resting.weight, "600");
                assert.equal(
                    appearance.resting.size,
                    appearance.rootSize * 0.9,
                );
                assert.equal(appearance.resting.background, "rgba(0, 0, 0, 0)");
                assert.equal(appearance.active.radius, "10px");
                assert.notEqual(
                    appearance.active.background,
                    appearance.resting.background,
                );
                await browser.evaluate(
                    "window.fixture.menu.setActive('');window.fixture.composer.openToolbar()",
                );
                await browser.evaluate(
                    `Promise.all(document.querySelector('.toolbar').getAnimations().map(animation=>animation.finished))`,
                );
                await browser.evaluate("document.activeElement.blur()");
                const menu =
                    await browser.evaluate(`Array.from(document.querySelectorAll('[data-side-menu-item]'), item => {
                const style = getComputedStyle(item); const rect = item.getBoundingClientRect();
                return { top:style.borderTopWidth,right:style.borderRightWidth,bottom:style.borderBottomWidth,radius:style.borderRadius,background:style.backgroundColor,height:rect.height };
            })`);
                assert.equal(menu.length, 2);
                for (const item of menu) {
                    assert.equal(item.top, "0px");
                    assert.equal(item.right, "0px");
                    assert.equal(item.bottom, "0px");
                    assert.equal(item.radius, "0px");
                    assert.equal(item.background, "rgba(0, 0, 0, 0)");
                    assert.ok(item.height >= 44);
                }
                await browser.evaluate(
                    `document.querySelector('[data-side-menu-item="second"]').focus()`,
                );
                await browser.command("Input.dispatchKeyEvent", {
                    type: "keyDown",
                    key: "Enter",
                    code: "Enter",
                    windowsVirtualKeyCode: 13,
                    text: "\r",
                });
                await browser.command("Input.dispatchKeyEvent", {
                    type: "keyUp",
                    key: "Enter",
                    code: "Enter",
                    windowsVirtualKeyCode: 13,
                });
                assert.equal(
                    await browser.evaluate("window.fixture.menuChoices.at(-1)"),
                    "second",
                );
                assert.equal(
                    await browser.evaluate(
                        `document.querySelector('[data-side-menu-item="second"]').getAttribute('aria-current')`,
                    ),
                    "page",
                );
                await captureScreenshot(
                    browser,
                    `navigation-menu-${width}-${height}`,
                );
                await browser.evaluate(
                    "window.fixture.composer.closeToolbar()",
                );
            });
        }
    },
);
