import test from "node:test";
import assert from "node:assert/strict";
import { reconcileAuthFooterLinks, renderAuthFooter } from "../auth-footer.js";
import { footerLinks } from "../footer-links.js";

test("authentication footer exposes both shared link contribution slots", () => {
    const markup = renderAuthFooter();
    assert.match(markup, /class="auth-footer"/);
    assert.match(markup, /data-footer-links="left"/);
    assert.match(markup, /data-footer-links="right"/);
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
