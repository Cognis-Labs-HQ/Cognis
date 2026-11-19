import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { serveBrowserFixture } from "../../../../ui/tests/integration/fixture-server.js";
import {
    findChromium,
    launchChromium,
} from "../../../../ui/tests/integration/chromium.js";
import { captureScreenshot } from "../../../../ui/tests/integration/artifacts.js";

const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;

test(
    "Messages sidebar uses its width, keeps short sections together and scrolls long lists",
    {
        skip: !executable && "Requires COGNIS_BROWSER_TESTS=1 and Chromium",
        timeout: 120000,
    },
    async (context) => {
        const server = await serveBrowserFixture(
            fileURLToPath(new URL("./fixtures/responsive/", import.meta.url)),
            {
                staticRoots: {
                    "/static/adapters/social/messages/": fileURLToPath(
                        new URL("../ui/", import.meta.url),
                    ),
                },
            },
        );
        context.after(() => server.close());
        const browser = await launchChromium(executable);
        context.after(() => browser.close());
        await browser.command("Page.navigate", { url: server.url });
        await browser.waitFor("window.fixtureReady === true");
        await browser.evaluate("document.fonts.ready");
        const states = await browser.evaluate(
            "window.fixture.data.sidebarStates",
        );
        for (const [width, height] of [
            [253, 509],
            [320, 568],
            [390, 844],
            [568, 320],
            [768, 1024],
            [1024, 768],
            [1440, 900],
            [1920, 1080],
        ]) {
            await browser.command("Emulation.setTouchEmulationEnabled", {
                enabled: width <= 1024,
                maxTouchPoints: 1,
            });
            await browser.callFunction(
                `function(size) { document.documentElement.style.fontSize = size + 'px'; }`,
                [width <= 320 ? 20 : 16],
            );
            await browser.resize(width, height);
            for (const state of states) {
                await context.test(
                    `${state.id} ${width}x${height}`,
                    async () => {
                        await browser.callFunction(
                            `function(state) {
                    window.fixture.setSidebarState({ roomCount: state.roomCount, templates: state.savedTemplates ? window.fixture.data.templates : [] });
                    window.fixture.composer.openToolbar();
                    document.querySelector('.toolbar').scrollTop = 0;
                }`,
                            [state],
                        );
                        await browser.evaluate(
                            `Promise.all(document.querySelector('.toolbar').getAnimations().map(animation => animation.finished))`,
                        );
                        const geometry = await browser.evaluate(`(() => {
                    const sidebar = document.querySelector('.messages-sidebar-content');
                    const toolbar = sidebar.closest('.toolbar');
                    const slot = sidebar.parentElement;
                    const slotStyle = getComputedStyle(slot);
                    const list = document.querySelector('#messages-rooms-list');
                    const templates = document.querySelector('.messages-sidebar-section');
                    const header = sidebar.querySelector('header');
                    const style = getComputedStyle(sidebar);
                    const bounds = sidebar.getBoundingClientRect();
                    const button = document.querySelector('#messages-new-btn').getBoundingClientRect();
                    return {
                        overflow: document.documentElement.scrollWidth - innerWidth,
                        toolbarOverflow: toolbar.scrollWidth - toolbar.clientWidth,
                        sectionGap: templates.getBoundingClientRect().top - list.getBoundingClientRect().bottom,
                        width: bounds.width, available: slot.clientWidth - parseFloat(slotStyle.paddingLeft) - parseFloat(slotStyle.paddingRight),
                        innerWidth: sidebar.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
                        headerWidth: header.getBoundingClientRect().width,
                        start: button.top, height: button.height,
                        closeBottom: innerWidth <= 900 ? document.querySelector('[data-composer-sidebar-trigger]').getBoundingClientRect().bottom : 0,
                        text: list.textContent,
                        newLabel: document.querySelector('#messages-new-btn').textContent.trim(),
                        expectedNewLabel: window.fixture.i18n.t('module.social.messages.new'),
                    };
                })()`);
                        assert.equal(
                            geometry.newLabel,
                            geometry.expectedNewLabel,
                        );
                        assert.ok(
                            geometry.overflow <= 1,
                            JSON.stringify(geometry),
                        );
                        assert.ok(
                            geometry.toolbarOverflow <= 1,
                            JSON.stringify(geometry),
                        );
                        assert.ok(
                            Math.abs(geometry.width - geometry.available) <= 2,
                            "Sidebar fills the Composer column",
                        );
                        assert.ok(
                            Math.abs(
                                geometry.headerWidth - geometry.innerWidth,
                            ) <= 2,
                            "Header uses the available content width",
                        );
                        assert.ok(
                            geometry.sectionGap >= 0 &&
                                geometry.sectionGap <= 16,
                            "Templates follows the room list without a spacer",
                        );
                        assert.ok(
                            geometry.height >= 44,
                            "New Room has a usable target",
                        );
                        if (width <= 900)
                            assert.ok(
                                geometry.start >= geometry.closeBottom + 4,
                                "Drawer content clears the close control",
                            );
                        await browser.evaluate(
                            `document.querySelector('#messages-sidebar-template-list').lastElementChild.scrollIntoView({ block: 'nearest', behavior: 'instant' })`,
                        );
                        const reachable = await browser.evaluate(`(() => {
                    const element = document.querySelector('#messages-sidebar-template-list').lastElementChild;
                    const rect = element.getBoundingClientRect();
                    return element.contains(document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2));
                })()`);
                        assert.equal(
                            reachable,
                            true,
                            "The last template or empty state is reachable through normal scrolling",
                        );
                        if (state.id === "empty" || width === 390)
                            await captureScreenshot(
                                browser,
                                `messages-sidebar-${state.id}-${width}-${height}`,
                            );
                        await browser.evaluate(
                            "window.fixture.composer.closeToolbar()",
                        );
                    },
                );
            }
        }
    },
);
