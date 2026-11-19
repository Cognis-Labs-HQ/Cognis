import test from "node:test";
import assert from "node:assert/strict";
import { skip, startFixture } from "./reuse/browser.js";
import { captureScreenshot } from "../integration/artifacts.js";

test(
    "Composer sidebars keep menu entries and form controls themed",
    { skip, timeout: 120000 },
    async (context) => {
        const { browser } = await startFixture(context, "?menus");
        for (const theme of ["dark", "light"]) {
            await browser.callFunction(
                "function(theme) { document.body.dataset.theme = theme; }",
                [theme],
            );
            for (const [width, height] of [
                [253, 600],
                [390, 844],
                [768, 1024],
                [1440, 900],
                [1920, 1080],
            ]) {
                await context.test(`${theme} ${width}x${height}`, async () => {
                    await browser.resize(width, height);
                    await browser.evaluate(
                        "window.fixture.menu.setActive('');window.fixture.composer.openToolbar()",
                    );
                    await browser.evaluate(
                        "Promise.all(document.querySelector('.toolbar').getAnimations().map(animation=>animation.finished))",
                    );
                    await browser.evaluate("document.activeElement.blur()");
                    await browser.command("Input.dispatchMouseEvent", {
                        type: "mouseMoved",
                        x: 0,
                        y: 0,
                    });
                    await browser.evaluate(
                        "Promise.all(document.querySelector('.toolbar').getAnimations({subtree:true}).map(animation=>animation.finished))",
                    );
                    const state = await browser.evaluate(`(() => {
                    const root = document.querySelector('.app-shell');
                    const probe = document.createElement('div');
                    probe.style.cssText = 'color:var(--text);background:var(--surface-soft);border-color:var(--control-border)';
                    root.append(probe); const style = getComputedStyle(probe);
                    const expected = {text:style.color, surface:style.backgroundColor, fieldBorder:style.borderColor};
                    probe.style.backgroundColor = 'var(--control-bg)';expected.fieldBackground=getComputedStyle(probe).backgroundColor;
                    probe.style.borderColor='var(--accent-2)';expected.accent=getComputedStyle(probe).borderTopColor;
                    probe.remove();
                    const items = [...root.querySelectorAll('[data-theme-menu-entry], [data-side-menu-item]')].map(item=> {
                        const style = getComputedStyle(item);const bounds = item.getBoundingClientRect();
                        return {background:style.backgroundColor,border:style.borderTopColor,borderWidth:style.borderTopWidth,height:bounds.height};
                    });
                    const field = getComputedStyle(root.querySelector('[data-theme-field]'));
                    const action = getComputedStyle(root.querySelector('[data-theme-action]'));
                    const actionStyle={background:action.backgroundColor,color:action.color};
                    return {items,expected,action:actionStyle,field:{background:field.backgroundColor,border:field.borderTopColor}};
                })()`);
                    for (const item of state.items) {
                        assert.equal(item.background, "rgba(0, 0, 0, 0)");
                        if (item.borderWidth !== "0px")
                            assert.equal(item.border, "rgba(0, 0, 0, 0)");
                        assert.ok(item.height >= 44);
                    }
                    assert.equal(
                        state.field.background,
                        state.expected.fieldBackground,
                    );
                    assert.equal(
                        state.field.border,
                        state.expected.fieldBorder,
                    );
                    assert.equal(state.action.background, "rgba(0, 0, 0, 0)");
                    assert.equal(state.action.color, state.expected.text);
                    const bounds = await browser.evaluate(
                        `(() => {const item=document.querySelector('[data-theme-menu-entry]');item.scrollIntoView({block:'nearest'});return item.getBoundingClientRect().toJSON()})()`,
                    );
                    await browser.command("Input.dispatchMouseEvent", {
                        type: "mouseMoved",
                        x: bounds.x + bounds.width / 2,
                        y: bounds.y + bounds.height / 2,
                    });
                    assert.equal(
                        await browser.evaluate(
                            "getComputedStyle(document.querySelector('[data-theme-menu-entry]')).backgroundColor",
                        ),
                        state.expected.surface,
                    );
                    await browser.evaluate(
                        "document.querySelector('[data-theme-menu-entry]').classList.add('active')",
                    );
                    assert.equal(
                        await browser.evaluate(
                            "getComputedStyle(document.querySelector('[data-theme-menu-entry]')).backgroundColor",
                        ),
                        state.expected.surface,
                    );
                    await browser.command("Input.dispatchKeyEvent", {
                        type: "keyDown",
                        key: "Tab",
                        code: "Tab",
                        windowsVirtualKeyCode: 9,
                    });
                    const focus = await browser.evaluate(
                        `(() => {const item=document.querySelector('[data-theme-menu-entry]');item.focus();const style=getComputedStyle(item);return{outline:style.outlineStyle,color:style.outlineColor}})()`,
                    );
                    assert.equal(focus.outline, "solid");
                    assert.equal(focus.color, state.expected.text);
                    await browser.evaluate(
                        "window.fixture.menu.setActive('first')",
                    );
                    await browser.evaluate(
                        "Promise.all(document.querySelector('.toolbar').getAnimations({subtree:true}).map(animation=>animation.finished))",
                    );
                    const selected = await browser.evaluate(
                        `(() => {const style=getComputedStyle(document.querySelector('[data-side-menu-item="first"]'));return{background:style.backgroundColor,indicator:style.borderInlineStartColor}})()`,
                    );
                    assert.equal(selected.background, state.expected.surface);
                    assert.equal(selected.indicator, state.expected.accent);
                    await captureScreenshot(
                        browser,
                        `sidebar-theme-${theme}-${width}-${height}`,
                    );
                    await browser.evaluate(
                        "document.querySelector('[data-theme-menu-entry]').classList.remove('active');window.fixture.composer.closeToolbar()",
                    );
                });
            }
        }
    },
);
