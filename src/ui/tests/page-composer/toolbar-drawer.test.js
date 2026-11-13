import assert from "node:assert/strict";
import test from "node:test";
import { mountComposerToolbarDrawer } from "../../reuse/page-composer/toolbar-drawer.js";
import { createDrawerDocument } from "../../reuse/tests/fixtures/drawer-dom.js";

function createToolbarFixture({ mobile = true, scrollable = true } = {}) {
    const fixture = createDrawerDocument({ mobile });
    const { document } = fixture;
    const root = document.createElement("div");
    const header = document.createElement("header");
    header.className = "site-header";
    header.height = 60;
    const footer = document.createElement("footer");
    footer.className = "global-footer";
    footer.height = 30;
    const mainWindow = document.createElement("main");
    mainWindow.className = "main-window";
    const toolbar = document.createElement("aside");
    toolbar.className = "toolbar";
    const disabled = document.createElement("button");
    disabled.disabled = true;
    const filter = document.createElement("button");
    const search = document.createElement("input");
    const link = document.createElement("a");
    link.setAttribute("href", "/settings");
    toolbar.append(disabled, filter, search, link);
    const content = document.createElement("section");
    content.className = "content-grid";
    mainWindow.append(toolbar, content);
    root.append(header, mainWindow, footer);
    document.body.append(root);
    const lifetime = new AbortController();
    const options = {
        root,
        i18n: { t: (key) => `translated:${key}` },
        toolbarScrollable: scrollable,
        signal: lifetime.signal,
    };
    const controller = mountComposerToolbarDrawer(options);
    return {
        ...fixture,
        root,
        header,
        footer,
        toolbar,
        filter,
        search,
        link,
        content,
        lifetime,
        controller,
        options,
        toggle: root.querySelector(".toolbar-mobile-toggle"),
        backdrop: root.querySelector(".toolbar-mobile-backdrop"),
    };
}

test("mobile toolbar starts inaccessible and the toggle names its controlled panel", () => {
    const fixture = createToolbarFixture();
    const { toolbar, toggle, backdrop, controller } = fixture;
    try {
        assert.equal(toolbar.inert, true);
        assert.equal(toolbar.getAttribute("aria-hidden"), "true");
        assert.equal(toggle.getAttribute("aria-controls"), toolbar.id);
        assert.equal(toggle.getAttribute("aria-expanded"), "false");
        assert.equal(
            toggle.getAttribute("aria-label"),
            "translated:ui.layout.toolbar.expand",
        );
        assert.equal(toggle.hidden, false);
        assert.equal(backdrop.hidden, true);
        fixture.search.focus();
        assert.equal(fixture.document.activeElement, fixture.document.body);
    } finally {
        controller.destroy();
    }
});

test("opening, keyboard cycling, and Escape retain focus in the drawer then restore the toggle", () => {
    const {
        document,
        toolbar,
        toggle,
        filter,
        search,
        link,
        content,
        controller,
    } = createToolbarFixture();
    try {
        toggle.focus();
        toggle.click();
        assert.equal(document.activeElement, filter);
        assert.equal(toolbar.inert, false);
        assert.equal(toolbar.getAttribute("aria-hidden"), null);
        assert.equal(toolbar.getAttribute("aria-modal"), "true");
        assert.equal(toggle.getAttribute("aria-expanded"), "true");
        assert.equal(
            toggle.getAttribute("aria-label"),
            "translated:ui.layout.toolbar.collapse",
        );
        assert.equal(content.inert, true);
        for (const expected of [search, link, toggle, filter]) {
            assert.equal(
                document.dispatch("keydown", { key: "Tab" }).defaultPrevented,
                true,
            );
            assert.equal(document.activeElement, expected);
        }
        document.dispatch("keydown", { key: "Tab", shiftKey: true });
        assert.equal(document.activeElement, toggle);
        document.dispatch("keydown", { key: "Escape" });
        assert.equal(document.activeElement, toggle);
        assert.equal(toolbar.inert, true);
        assert.equal(content.inert, false);
        assert.equal(document.body.style.overflow, "");
        assert.equal(toggle.getAttribute("aria-expanded"), "false");
    } finally {
        controller.destroy();
    }
});

test("filters stay open while links and successful composer navigation can close the drawer", () => {
    const { toolbar, toggle, filter, link, controller } =
        createToolbarFixture();
    try {
        toggle.click();
        filter.click();
        assert.equal(toggle.getAttribute("aria-expanded"), "true");
        link.click();
        assert.equal(toggle.getAttribute("aria-expanded"), "false");
        toggle.click();
        link.addEventListener("click", (event) => event.preventDefault());
        link.click();
        assert.equal(toggle.getAttribute("aria-expanded"), "true");
        controller.closeMobileDrawerIfNeeded();
        assert.equal(toolbar.inert, true);
        assert.equal(toggle.getAttribute("aria-expanded"), "false");
    } finally {
        controller.destroy();
    }
});

test("backdrop closes the toolbar and viewport changes keep focused controls visible", () => {
    const { document, toolbar, toggle, backdrop, filter, media, controller } =
        createToolbarFixture();
    try {
        toggle.click();
        backdrop.click();
        assert.equal(document.activeElement, toggle);
        assert.equal(backdrop.hidden, true);
        media.setMobile(false);
        assert.equal(toolbar.inert, false);
        assert.equal(toolbar.getAttribute("aria-hidden"), null);
        assert.equal(toggle.hidden, true);
        assert.equal(document.activeElement, toolbar);
        filter.focus();
        media.setMobile(true);
        assert.equal(toolbar.inert, true);
        assert.equal(document.activeElement, toggle);
        toggle.click();
        media.setMobile(false);
        assert.equal(toolbar.inert, false);
        assert.equal(toolbar.getAttribute("aria-modal"), null);
        assert.equal(document.activeElement, filter);
        assert.equal(document.body.style.overflow, "");
    } finally {
        controller.destroy();
    }
});

test("scrollable toolbars use the full mobile height and remeasure desktop chrome", () => {
    const { toolbar, header, media, observers, controller } =
        createToolbarFixture({ mobile: false });
    try {
        assert.equal(
            toolbar.style.getPropertyValue("--toolbar-sticky-top"),
            "60px",
        );
        assert.match(
            toolbar.style.getPropertyValue("--toolbar-max-height"),
            /60px - 30px/,
        );
        assert.equal(observers[0].observed.size, 3);
        media.setMobile(true);
        assert.equal(
            toolbar.style.getPropertyValue("--toolbar-max-height"),
            "100dvh",
        );
        assert.equal(
            toolbar.style.getPropertyValue("--toolbar-sticky-top"),
            "0px",
        );
        header.height = 85;
        observers[0].callback();
        assert.equal(
            toolbar.style.getPropertyValue("--toolbar-max-height"),
            "100dvh",
        );
        media.setMobile(false);
        assert.equal(
            toolbar.style.getPropertyValue("--toolbar-sticky-top"),
            "85px",
        );
    } finally {
        controller.destroy();
    }
});

test("abort removes controls, observers and listeners, restores markup, and prevents stale actions", () => {
    const {
        document,
        root,
        toolbar,
        toggle,
        media,
        observers,
        lifetime,
        controller,
    } = createToolbarFixture();
    toggle.click();
    assert.equal(document.listenerCount("keydown"), 1);
    lifetime.abort();
    controller.destroy();
    assert.equal(root.querySelector(".toolbar-mobile-toggle"), null);
    assert.equal(root.querySelector(".toolbar-mobile-backdrop"), null);
    assert.equal(toolbar.inert, false);
    assert.equal(toolbar.getAttribute("aria-hidden"), null);
    assert.equal(toolbar.getAttribute("role"), null);
    assert.equal(toolbar.getAttribute("tabindex"), null);
    assert.equal(toolbar.id, "");
    assert.equal(toolbar.style.getPropertyValue("--toolbar-max-height"), "");
    assert.equal(document.listenerCount("keydown"), 0);
    assert.equal(media.listenerCount("change"), 0);
    assert.equal(toolbar.listenerCount("click"), 0);
    assert.equal(toggle.listenerCount("click"), 0);
    assert.equal(observers[0].disconnected, true);
    toggle.click();
    media.setMobile(false);
    observers[0].callback();
    assert.equal(toolbar.classList.contains("toolbar--mobile-open"), false);
    assert.equal(toolbar.style.getPropertyValue("--toolbar-max-height"), "");
});

test("repeated mounting disposes the previous controller and retains only one live drawer", () => {
    const { document, root, options, toggle, media, observers, controller } =
        createToolbarFixture();
    toggle.click();
    const replacement = mountComposerToolbarDrawer(options);
    try {
        controller.destroy();
        assert.equal(root.querySelectorAll(".toolbar-mobile-toggle").length, 1);
        assert.equal(
            root.querySelectorAll(".toolbar-mobile-backdrop").length,
            1,
        );
        assert.equal(media.listenerCount("change"), 1);
        assert.equal(observers[0].disconnected, true);
        assert.equal(document.listenerCount("keydown"), 0);
        root.querySelector(".toolbar-mobile-toggle").click();
        assert.equal(document.listenerCount("keydown"), 1);
        assert.equal(document.body.style.overflow, "hidden");
    } finally {
        replacement.destroy();
    }
});

test("an already canceled composer does not create a drawer", () => {
    const fixture = createToolbarFixture();
    fixture.lifetime.abort();
    assert.equal(mountComposerToolbarDrawer(fixture.options), null);
    assert.equal(fixture.root.querySelector(".toolbar-mobile-toggle"), null);
    assert.equal(fixture.media.listenerCount("change"), 0);
});

test("cleanup preserves existing panel identifiers, labels and sizing declarations", () => {
    const { toolbar, options, root, controller } = createToolbarFixture();
    controller.destroy();
    toolbar.id = "owned-toolbar";
    toolbar.setAttribute("aria-label", "Existing toolbar label");
    toolbar.setAttribute("aria-hidden", "false");
    toolbar.tabIndex = 3;
    toolbar.classList.add("toolbar--scrollable");
    toolbar.style.setProperty("--toolbar-max-height", "72vh", "important");
    const replacement = mountComposerToolbarDrawer(options);
    assert.equal(
        root
            .querySelector(".toolbar-mobile-toggle")
            .getAttribute("aria-controls"),
        "owned-toolbar",
    );
    replacement.destroy();
    assert.equal(toolbar.id, "owned-toolbar");
    assert.equal(toolbar.getAttribute("aria-label"), "Existing toolbar label");
    assert.equal(toolbar.getAttribute("aria-hidden"), "false");
    assert.equal(toolbar.tabIndex, 3);
    assert.equal(toolbar.classList.contains("toolbar--scrollable"), true);
    assert.equal(
        toolbar.style.getPropertyValue("--toolbar-max-height"),
        "72vh",
    );
    assert.equal(
        toolbar.style.getPropertyPriority("--toolbar-max-height"),
        "important",
    );
});

test("non-scrollable toolbars remain keyboard operable without a layout observer", () => {
    const { toolbar, toggle, document, filter, observers, controller } =
        createToolbarFixture({ scrollable: false });
    try {
        assert.equal(observers.length, 0);
        assert.equal(toolbar.tabIndex, -1);
        toggle.click();
        assert.equal(document.activeElement, filter);
        document.dispatch("keydown", { key: "Escape" });
        assert.equal(document.activeElement, toggle);
    } finally {
        controller.destroy();
    }
});
