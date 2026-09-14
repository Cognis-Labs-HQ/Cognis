import assert from "node:assert/strict";
import test from "node:test";

import {
    createFooterLinkRegistry,
    isFooterLinkActive,
} from "../footer-links.js";

test("footer link registry contributes links to either shell side", () => {
    const registry = createFooterLinkRegistry();
    const removeLegal = registry.add({
        id: "legal",
        side: "right",
        href: "/terms-of-service",
        label: "Terms",
    });
    registry.add({
        id: "help",
        side: "left",
        href: "/docs",
        labelKey: "ui.reuse.docs",
    });

    assert.deepEqual(
        registry.list("right").map((link) => link.id),
        ["legal"],
    );
    assert.deepEqual(
        registry.list("left").map((link) => link.id),
        ["help"],
    );
    removeLegal();
    assert.deepEqual(registry.list("right"), []);
});

test("footer links are active for their route and its descendants", () => {
    globalThis.window = { location: { origin: "https://cognis.test" } };
    assert.equal(isFooterLinkActive("/docs", "/docs/latest/overview"), true);
    assert.equal(isFooterLinkActive("/docs", "/documentation"), false);
    assert.equal(isFooterLinkActive("/changelogs", "/docs/overview"), false);
});

test("footer link registry rejects invalid and duplicate contributions", () => {
    const registry = createFooterLinkRegistry();
    assert.throws(() => registry.add({ id: "missing" }), /require/);
    assert.throws(
        () =>
            registry.add({
                id: "bad-side",
                side: "middle",
                href: "/docs",
                label: "Docs",
            }),
        /side/,
    );
    registry.add({ id: "docs", href: "/docs", label: "Docs" });
    assert.throws(
        () => registry.add({ id: "docs", href: "/other", label: "Other" }),
        /already exists/,
    );
});
