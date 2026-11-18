import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";
import { captureScreenshot } from "../integration/artifacts.js";

test(
    "page navigation shares primary appearance and sidebar choices remain menu entries",
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
                const primary = document.querySelector('.topnav a');
                const secondary = document.querySelector('[data-fixture-nav]');
                const properties = ['color','backgroundColor','padding','marginRight','fontFamily','fontSize','fontWeight','letterSpacing','borderRadius','borderBottomWidth','borderBottomColor','opacity'];
                const read = element => Object.fromEntries(properties.map(key => [key,getComputedStyle(element)[key]]));
                const resting = { primary: read(primary), secondary: read(secondary) };
                primary.classList.add('active'); secondary.classList.add('active');
                const active = { primary: read(primary), secondary: read(secondary) };
                primary.classList.remove('active'); secondary.classList.remove('active');
                return { resting, active };
            })()`);
                assert.deepEqual(
                    appearance.resting.secondary,
                    appearance.resting.primary,
                );
                const { borderBottomColor: secondaryIndicator, ...secondary } =
                    appearance.active.secondary;
                const { borderBottomColor: primaryIndicator, ...primary } =
                    appearance.active.primary;
                assert.deepEqual(secondary, primary);
                assert.equal(secondaryIndicator, secondary.color);
                assert.notEqual(primaryIndicator, secondaryIndicator);
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
