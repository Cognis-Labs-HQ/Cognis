import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    reconcileAuthFooterLinks,
    renderAuthFooter,
} from "../../auth-footer.js";
import { footerLinks } from "../../footer-links.js";

test("authentication footer exposes both shared link contribution slots", () => {
    const markup = renderAuthFooter();
    assert.match(markup, /class="auth-footer"/);
    assert.match(markup, /data-footer-links="left"/);
    assert.match(markup, /data-footer-links="right"/);
});

test("authentication footer accepts context-scoped side-effect contributors", () => {
    const source = readFileSync(
        new URL("../../auth-footer.js", import.meta.url),
        "utf8",
    );
    assert.match(source, /footerLinks\.withContexts/);
    assert.doesNotMatch(source, /auth_footer_link_provider_required/);
});

test("footer contexts keep application-only links off authentication pages", () => {
    const removeApplicationLink = footerLinks.add({
        id: "test:changelog",
        href: "/changelogs",
        label: "Changelogs",
    });
    const removePublicLink = footerLinks.add({
        id: "test:license",
        href: "/license",
        label: "License",
        contexts: ["application", "authentication"],
    });

    assert.deepEqual(
        footerLinks
            .list()
            .filter(({ contexts }) => contexts.includes("authentication"))
            .map(({ id }) => id),
        ["test:license"],
    );

    removeApplicationLink();
    removePublicLink();
});

test("authentication footer replaces a provider's published link set", () => {
    reconcileAuthFooterLinks("legal", [
        { id: "terms", href: "/terms", label: "Terms", side: "right" },
    ]);
    assert.deepEqual(
        footerLinks
            .list()
            .filter(({ id }) => id.startsWith("legal:"))
            .map(({ id, href }) => ({ id, href })),
        [{ id: "legal:terms", href: "/terms" }],
    );
    assert.deepEqual(
        footerLinks.list().find(({ id }) => id === "legal:terms")?.contexts,
        ["authentication"],
    );

    assert.throws(
        () => reconcileAuthFooterLinks("legal", [{ id: "draft" }]),
        /invalid_auth_footer_link/,
    );
    assert.equal(
        footerLinks.list().some(({ id }) => id === "legal:terms"),
        true,
    );

    reconcileAuthFooterLinks("legal", []);
    assert.deepEqual(
        footerLinks.list().filter(({ id }) => id.startsWith("legal:")),
        [],
    );
});

test("cached auth footer clients reconcile the same provider and retain new-tab targets", async () => {
    const other = await import("../../auth-footer.js?client=static-module");
    reconcileAuthFooterLinks("shared-provider", [
        { id: "terms", href: "/terms", label: "Terms", target: "_blank" },
    ]);
    other.reconcileAuthFooterLinks("shared-provider", [
        { id: "privacy", href: "/privacy", label: "Privacy", target: "_blank" },
    ]);
    const links = footerLinks
        .list()
        .filter(({ id }) => id.startsWith("shared-provider:"));
    assert.equal(links.length, 1);
    assert.equal(links[0].href, "/privacy");
    assert.equal(links[0].target, "_blank");
    assert.throws(
        () =>
            other.reconcileAuthFooterLinks("shared-provider", [
                { id: "bad", href: "/bad", label: "Bad", target: "unexpected" },
            ]),
        /invalid_auth_footer_link_target/,
    );
    assert.equal(
        footerLinks.list().find(({ id }) => id === "shared-provider:privacy")
            .href,
        "/privacy",
    );
    other.reconcileAuthFooterLinks("shared-provider", []);
});
