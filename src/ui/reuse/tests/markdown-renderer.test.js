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

test("renderMarkdown detects code language from shebang and highlights code", () => {
    const html = renderMarkdown("```\n#!/usr/bin/env node\nconst x = 1;\n```");
    assert.match(
        html,
        /<pre class="markdown-code-block"><code class="markdown-code language-javascript" data-language="javascript">/,
    );
    assert.match(
        html,
        /<span class="markdown-token markdown-token--keyword">const<\/span>/,
    );
    assert.match(
        html,
        /<span class="markdown-token markdown-token--number">1<\/span>/,
    );
});

test("renderMarkdown normalizes paragraph line spacing", () => {
    const html = renderMarkdown(
        "First line\ncontinues here\n\nSecond paragraph",
    );
    assert.equal(
        html,
        "<p>First line continues here</p>\n<p>Second paragraph</p>",
    );
});
