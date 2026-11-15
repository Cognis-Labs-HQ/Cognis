import test from "node:test";
import assert from "node:assert/strict";
import {
    skip,
    startFixture,
    captureScreenshot,
    rectangles,
    assertHorizontallyContained,
    assertNoDocumentOverflow,
} from "./reuse/browser.js";

const viewports = [
    [1860, 540],
    [1440, 900],
    [1024, 768],
    [768, 1024],
    [390, 844],
    [320, 568],
    [568, 320],
];

for (const buttonStylesOrder of ["before", "after"]) {
    test(
        `desktop toolbar and content share a row with button styles ${buttonStylesOrder}`,
        { skip, timeout: 30000 },
        async (context) => {
            const { browser } = await startFixture(context, "", [1860, 540]);
            await browser.evaluate(`(() => {
            const buttons = document.querySelector('link[href="/static/styles/reuse/buttons.css"]');
            const composer = document.querySelector('link[href="/static/styles/page-builder.css"]');
            composer.${buttonStylesOrder}(buttons);
        })()`);
            for (const [width, height] of [
                [1860, 540],
                [900, 540],
                [901, 540],
                [1440, 900],
            ]) {
                await browser.resize(width, height);
                const [toggle] = await rectangles(
                    browser,
                    ".toolbar-mobile-toggle",
                );
                if (width <= 900) {
                    assertHorizontallyContained(
                        toggle,
                        width,
                        "Mobile toolbar toggle",
                    );
                    continue;
                }
                assert.equal(
                    toggle.width,
                    0,
                    "Desktop toggle does not occupy a grid cell",
                );
                const [toolbar] = await rectangles(browser, ".toolbar");
                const [content] = await rectangles(
                    browser,
                    ".main-window > .content-grid",
                );
                assert.ok(
                    content.left >= toolbar.right,
                    "Content sits beside the toolbar",
                );
                assert.ok(
                    Math.abs(content.top - toolbar.top) <= 1,
                    "Content starts on the toolbar row",
                );
                await captureScreenshot(
                    browser,
                    `desktop-layout-${width}-${height}`,
                );
            }
        },
    );
}

for (const mode of ["grid", "nested"]) {
    test(
        `${mode} composer fits responsive viewports and retains form nodes`,
        { skip, timeout: 60000 },
        async (context) => {
            const { browser } = await startFixture(
                context,
                `?mode=${mode}&scenario=oversized`,
                [320, 568],
            );
            await browser.evaluate(`(() => {
      const field = document.querySelector('[name="draft"]');
      field.value = 'Unsaved responsive draft';
      field.focus();
      field.setSelectionRange(8, 18);
      document.querySelector('[name="enabled"]').checked = true;
      document.querySelector('[name="notes"]').value = 'Retained notes';
      window.fixture.originalField = field;
      window.fixture.scrollPane = document.querySelector('[data-fixture-scroll]');
      window.fixture.scrollPane.scrollTop = 80;
    })()`);
            for (const [width, height] of viewports) {
                await context.test(`${width}×${height}`, async () => {
                    await browser.resize(width, height);
                    await assertNoDocumentOverflow(browser, width);
                    const cards = await rectangles(
                        browser,
                        "[data-composer-element]",
                    );
                    assert.equal(cards.length, 2);
                    for (const card of cards) {
                        assertHorizontallyContained(card, width, card.id);
                        if (card.compact) {
                            assert.ok(
                                Math.abs(card.width - card.parentWidth) <= 2,
                                `${card.id} uses compact container width`,
                            );
                        }
                    }
                    if (width <= 640) {
                        assert.ok(
                            cards[1].top >= cards[0].bottom - 1,
                            "Compact cards stack without overlap",
                        );
                    }
                    const values = await browser.evaluate(`({
          draft: document.querySelector('[name="draft"]').value,
          checked: document.querySelector('[name="enabled"]').checked,
          notes: document.querySelector('[name="notes"]').value,
          sameNode: document.querySelector('[name="draft"]') === window.fixture.originalField,
          selection: [window.fixture.originalField.selectionStart, window.fixture.originalField.selectionEnd],
          sameScrollPane: document.querySelector('[data-fixture-scroll]') === window.fixture.scrollPane,
          scrollTop: window.fixture.scrollPane.scrollTop,
        })`);
                    assert.deepEqual(values, {
                        draft: "Unsaved responsive draft",
                        checked: true,
                        notes: "Retained notes",
                        sameNode: true,
                        selection: [8, 18],
                        sameScrollPane: true,
                        scrollTop: 80,
                    });
                    const reachable = await browser.evaluate(`(async () => {
          const action = document.querySelector('[data-fixture-last]');
          action.scrollIntoView({ block: 'center', behavior: 'instant' });
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          const bounds = action.getBoundingClientRect();
          return action.contains(document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2));
        })()`);
                    assert.equal(
                        reachable,
                        true,
                        "Final card action is reachable without clipping",
                    );
                    await browser.evaluate(
                        'window.scrollTo({top:0,behavior:"instant"})',
                    );
                    await captureScreenshot(
                        browser,
                        `${mode}-${width}-${height}`,
                    );
                });
            }
            await browser.resize(1440, 900);
            await browser.evaluate(`(() => {
      const card = document.querySelector('[data-composer-element="content"]');
      card.scrollTop = 120;
      window.fixture.cardScroll = card.scrollTop;
    })()`);
            await browser.resize(1280, 900);
            const scroll = await browser.evaluate(`(() => {
      const card = document.querySelector('[data-composer-element="content"]');
      return { actual: card.scrollTop, expected: Math.min(window.fixture.cardScroll, card.scrollHeight - card.clientHeight) };
    })()`);
            assert.equal(
                scroll.actual,
                scroll.expected,
                "Card scroll survives resize within scrollable presentation",
            );
        },
    );
}

test(
    "resizing does not overwrite saved desktop layout profiles",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser, server } = await startFixture(context);
        await browser.evaluate(
            'document.querySelector("#composer-edit-toggle").click()',
        );
        await browser.waitFor(
            'Boolean(document.querySelector(".composer-grid-active"))',
        );
        await browser.evaluate(
            'document.querySelector("#composer-edit-toggle").click()',
        );
        await browser.waitFor(
            '!document.querySelector(".composer-grid-active")',
        );
        const saved = structuredClone(server.layouts.get("responsive-grid"));
        assert.ok(
            saved?.layoutsByGrid,
            "Explicit Done saves a real layout profile",
        );
        const writes = server.requests.filter(
            (request) => request.method === "PUT",
        ).length;
        const desktop = await rectangles(browser, "[data-composer-element]");
        await browser.resize(320, 568);
        await browser.resize(768, 1024);
        await browser.resize(1440, 900);
        assert.deepEqual(server.layouts.get("responsive-grid"), saved);
        assert.equal(
            server.requests.filter((request) => request.method === "PUT")
                .length,
            writes,
        );
        assert.deepEqual(
            await rectangles(browser, "[data-composer-element]"),
            desktop,
        );
    },
);

test(
    "mobile navigation and toolbar support keyboard, touch-sized controls and orientation changes",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser } = await startFixture(context);
        await browser.command("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 5,
        });
        await browser.resize(320, 568);
        await browser.waitFor(
            '!document.querySelector("#nav-compact-toggle").hidden',
        );
        await browser.evaluate(
            'document.querySelector("#nav-compact-toggle").click()',
        );
        await browser.waitFor(
            'document.querySelector("#nav-drawer").getAttribute("aria-hidden") === "false"',
        );
        await browser.command("Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "Tab",
            code: "Tab",
            windowsVirtualKeyCode: 9,
            modifiers: 0,
        });
        assert.equal(
            await browser.evaluate(
                'document.querySelector("#nav-drawer").contains(document.activeElement)',
            ),
            true,
        );
        await browser.command("Input.dispatchKeyEvent", {
            type: "keyDown",
            key: "Escape",
            code: "Escape",
            windowsVirtualKeyCode: 27,
        });
        assert.equal(
            await browser.evaluate("document.activeElement.id"),
            "nav-compact-toggle",
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelector("#nav-drawer").inert',
            ),
            true,
        );
        for (const [width, height] of [
            [320, 568],
            [390, 844],
            [568, 320],
        ]) {
            await browser.resize(width, height);
            await browser.evaluate(
                'document.querySelector(".toolbar-mobile-toggle").click()',
            );
            await browser.waitFor(
                'document.querySelector(".toolbar-mobile-toggle").getAttribute("aria-expanded") === "true"',
            );
            await browser.evaluate(
                `Promise.all(document.querySelector('.toolbar').getAnimations().map(animation => animation.finished))`,
            );
            const [toolbar] = await rectangles(browser, ".toolbar");
            const [toggle] = await rectangles(
                browser,
                ".toolbar-mobile-toggle",
            );
            assertHorizontallyContained(toolbar, width, "Toolbar");
            assertHorizontallyContained(toggle, width, "Toolbar close toggle");
            assert.ok(
                toggle.width >= 44 && toggle.height >= 44,
                "Toolbar close touch target is at least 44px",
            );
            assert.ok(
                toolbar.top >= -1 && toolbar.bottom <= height + 1,
                "Toolbar fits viewport height",
            );
            await captureScreenshot(browser, `toolbar-${width}-${height}`);
            await browser.command("Input.dispatchKeyEvent", {
                type: "keyDown",
                key: "Escape",
                code: "Escape",
                windowsVirtualKeyCode: 27,
            });
            await browser.waitFor(
                'document.querySelector(".toolbar-mobile-toggle").getAttribute("aria-expanded") === "false"',
            );
        }
        await browser.resize(1440, 900);
        assert.equal(
            await browser.evaluate('document.querySelector(".toolbar").inert'),
            false,
        );
        assert.equal(
            await browser.evaluate(
                'document.querySelector(".toolbar-mobile-toggle").hidden',
            ),
            true,
        );
    },
);

test(
    "popup actions and search remain reachable on narrow and short landscape screens",
    { skip, timeout: 30000 },
    async (context) => {
        const { browser } = await startFixture(context);
        await browser.command("Emulation.setTouchEmulationEnabled", {
            enabled: true,
            maxTouchPoints: 5,
        });
        for (const [width, height] of [
            [320, 568],
            [568, 320],
        ]) {
            await browser.resize(width, height);
            await browser.evaluate("void window.fixture.openFixturePopup()");
            await browser.waitFor(
                'Boolean(document.querySelector(".popup-overlay--visible"))',
            );
            await browser.evaluate(
                `Promise.all(document.querySelector('.popup-overlay').getAnimations({subtree: true}).map(animation => animation.finished))`,
            );
            const [dialog] = await rectangles(browser, ".popup-dialog");
            assertHorizontallyContained(dialog, width, "Popup");
            assert.ok(
                dialog.top >= 0 && dialog.bottom <= height,
                "Popup fits short viewport",
            );
            const [close] = await rectangles(browser, ".popup-close-btn");
            assert.ok(
                close.width >= 44 && close.height >= 44,
                "Popup close is touch sized",
            );
            await captureScreenshot(browser, `popup-${width}-${height}`);
            await browser.evaluate(
                'document.querySelector(".popup-footer button").scrollIntoView({block:"nearest"})',
            );
            const [action] = await rectangles(browser, ".popup-footer button");
            assert.ok(
                action.top >= 0 && action.bottom <= height,
                "Popup footer can scroll into view",
            );
            await browser.evaluate(
                'document.querySelector(".popup-footer button").click()',
            );
            await browser.waitFor('!document.querySelector(".popup-overlay")');
            assert.equal(
                await browser.evaluate("window.fixture.popupResult"),
                "save",
            );
            await browser.evaluate(
                "window.fixture.closeSearch = window.fixture.openFixtureSearch()",
            );
            await browser.waitFor(
                'Boolean(document.querySelector(".search-popup"))',
            );
            const [search] = await rectangles(browser, ".search-popup");
            assertHorizontallyContained(search, width, "Search");
            assert.ok(
                search.top >= 0 && search.bottom <= height,
                "Search fits short viewport",
            );
            await captureScreenshot(browser, `search-${width}-${height}`);
            await browser.evaluate("window.fixture.closeSearch()");
            await browser.waitFor(
                '!document.querySelector(".search-popup-overlay")',
            );
        }
    },
);
