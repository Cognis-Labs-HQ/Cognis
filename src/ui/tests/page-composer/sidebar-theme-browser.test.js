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
                    const panels = await browser.evaluate(`(() => {
                        const style = selector => getComputedStyle(document.querySelector(selector));
                        const sidebar = style('.toolbar'); const main = style('.content-panel');
                        const card = style('[data-composer-element]');
                        const section = style('.fixture-owned-sidebar'); const content = style('.fixture-owned-content');
                        return {sidebar:sidebar.backgroundColor,main:main.backgroundColor,card:card.backgroundColor,
                            section:section.backgroundColor,content:content.backgroundColor,sectionBorder:section.borderTopWidth,sectionShadow:section.boxShadow,mainOpacity:main.opacity,sectionOpacity:section.opacity,contentOpacity:content.opacity};
                    })()`);
                    assert.equal(panels.main, panels.sidebar);
                    assert.equal(panels.mainOpacity, "1");
                    assert.equal(panels.sectionOpacity, "1");
                    assert.equal(panels.contentOpacity, "1");
                    assert.notEqual(panels.main, "rgba(0, 0, 0, 0)");
                    for (const value of [
                        panels.card,
                        panels.section,
                        panels.content,
                    ])
                        assert.equal(value, "rgba(0, 0, 0, 0)");
                    assert.equal(panels.sectionBorder, "0px");
                    assert.equal(panels.sectionShadow, "none");
                    const rootControls = await browser.evaluate(`(() => {
                        const field=getComputedStyle(document.querySelector('[data-theme-root-field]'));
                        const nested=getComputedStyle(document.querySelector('[data-theme-field]'));
                        const action=getComputedStyle(document.querySelector('[data-theme-root-action]'));
                        return{field:field.backgroundColor,nested:nested.backgroundColor,border:field.borderTopColor,nestedBorder:nested.borderTopColor,actionBorder:action.borderTopWidth};
                    })()`);
                    assert.equal(rootControls.field, rootControls.nested);
                    assert.equal(
                        rootControls.border,
                        rootControls.nestedBorder,
                    );
                    assert.equal(rootControls.actionBorder, "1px");
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
                    await browser.evaluate(
                        "document.querySelector('[data-theme-menu-entry]').classList.remove('active');document.querySelector('[data-theme-menu-entry]').setAttribute('aria-pressed','true')",
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
                        `(() => {const style=getComputedStyle(document.querySelector('[data-side-menu-item="first"]'));return{background:style.backgroundColor,border:style.borderInlineStartWidth}})()`,
                    );
                    assert.equal(selected.background, state.expected.surface);
                    assert.equal(selected.border, "0px");
                    await captureScreenshot(
                        browser,
                        `sidebar-theme-${theme}-${width}-${height}`,
                    );
                    await browser.evaluate(
                        "document.querySelector('[data-theme-menu-entry]').classList.remove('active');document.querySelector('[data-theme-menu-entry]').removeAttribute('aria-pressed');window.fixture.composer.closeToolbar()",
                    );
                });
            }
        }
    },
);

test(
    "Composer gives the main window its full width when sidebar contributions are empty",
    { skip },
    async (context) => {
        const { browser } = await startFixture(context, "?empty-toolbar");
        const widths = await browser.evaluate(`(() => {
        const main=document.querySelector('.main-window');
        return {main:main.getBoundingClientRect().width, content:main.querySelector('.content-grid').getBoundingClientRect().width, sidebars:main.querySelectorAll('.toolbar').length};
    })()`);
        assert.equal(widths.sidebars, 0);
        assert.ok(Math.abs(widths.main - widths.content) <= 1);
    },
);

test(
    "Modules filters use the Composer menu surface and full sidebar width",
    { skip, timeout: 60000 },
    async (context) => {
        const { browser } = await startFixture(context, "?module-sidebar");
        for (const theme of ["dark", "light"]) {
            await browser.callFunction(
                "function(theme) {document.body.dataset.theme=theme}",
                [theme],
            );
            for (const [width, height] of [
                [390, 844],
                [768, 1024],
                [1440, 900],
            ]) {
                await context.test(`${theme} ${width}`, async () => {
                    await browser.resize(width, height);
                    await browser.evaluate(
                        "window.fixture.composer.openToolbar()",
                    );
                    await browser.evaluate(
                        "Promise.all(document.querySelector('.toolbar').getAnimations({subtree:true}).map(animation=>animation.finished))",
                    );
                    await browser.evaluate("document.activeElement.blur()");
                    const state = await browser.evaluate(`(() => {
                    const sidebar=document.querySelector('[data-module-sidebar]');
                    const probe=document.createElement('div');probe.style.background='var(--surface-soft)';sidebar.append(probe);
                    const selectedBackground=getComputedStyle(probe).backgroundColor;probe.remove();
                    return{width:sidebar.getBoundingClientRect().width,selectedBackground,items:[...sidebar.querySelectorAll('button')].map(button=> {
                        const style=getComputedStyle(button);return{width:button.getBoundingClientRect().width,border:style.borderTopWidth,background:style.backgroundColor,selected:button.getAttribute('aria-pressed')==='true'};
                    })};
                })()`);
                    assert.equal(state.items.length, 5);
                    for (const item of state.items) {
                        assert.ok(Math.abs(item.width - state.width) <= 1);
                        assert.equal(item.border, "0px");
                        assert.equal(
                            item.background,
                            item.selected
                                ? state.selectedBackground
                                : "rgba(0, 0, 0, 0)",
                        );
                    }
                    await browser.evaluate(
                        "window.fixture.composer.closeToolbar()",
                    );
                });
            }
        }
    },
);
