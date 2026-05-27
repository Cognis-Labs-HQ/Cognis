import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdown } from "../markdown-renderer.js";

test("renderMarkdown renders markdown hyperlinks safely", () => {
    const html = renderMarkdown("[Cognis](https://cognis.example)");
    assert.equal(
        html,
        '<p><a href="https://cognis.example" target="_blank" rel="noopener noreferrer">Cognis</a></p>',
    );
});

test("renderMarkdown escapes HTML in markdown content", () => {
    const html = renderMarkdown("hello <script>alert(1)</script>");
    assert.equal(html, "<p>hello &lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("renderMarkdown does not render unsafe link protocols", () => {
    const html = renderMarkdown("[x](javascript:alert%281%29)");
    assert.equal(html, "<p>x</p>");
});
