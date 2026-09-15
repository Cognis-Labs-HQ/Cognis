import test from "node:test";
import assert from "node:assert/strict";
import { renderAuthFooter } from "../auth-footer.js";

test("authentication footer exposes both shared link contribution slots", () => {
    const markup = renderAuthFooter();
    assert.match(markup, /class="auth-footer"/);
    assert.match(markup, /data-footer-links="left"/);
    assert.match(markup, /data-footer-links="right"/);
});
