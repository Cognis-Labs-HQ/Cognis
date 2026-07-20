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
    const html = renderMarkdown(
        "[x](javascript:alert%281%29) [m](mailto:admin@example.test) [r](/docs)",
    );
    assert.equal(html, "<p>x m r</p>");
});

test("renderMarkdown detects plain HTTP URLs as hyperlinks", () => {
    const html = renderMarkdown("Visit https://cognis.example/docs.");
    assert.equal(
        html,
        '<p>Visit <a href="https://cognis.example/docs" target="_blank" rel="noopener noreferrer">https://cognis.example/docs</a>.</p>',
    );
});

test("renderMarkdown does not detect non-HTTP URLs as hyperlinks", () => {
    const html = renderMarkdown(
        "Email mailto:admin@example.test or open cognis://profile/me",
    );
    assert.equal(
        html,
        "<p>Email mailto:admin@example.test or open cognis://profile/me</p>",
    );
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

test("renderMarkdown adds copy controls to inline code", () => {
    const html = renderMarkdown("Use `npm test` now");
    assert.match(
        html,
        /<span class="markdown-code-inline"><code>npm test<\/code>/,
    );
    assert.match(
        html,
        /<button class="markdown-code-copy" data-markdown-code-copy="npm test" type="button" aria-label="Copy">.*<span class="markdown-code-copy-label"><\/span><\/button>/,
    );
});

test("renderMarkdown inline code copy value preserves escaped source", () => {
    const html = renderMarkdown("Use `<tag>` safely");
    assert.match(html, /<code>&lt;tag&gt;<\/code>/);
    assert.match(html, /data-markdown-code-copy="&lt;tag&gt;"/);
});

test("renderMarkdown adds copy controls with raw code block contents", () => {
    const html = renderMarkdown("```js\nconst x = 1;\n```");
    assert.match(html, /data-markdown-code-copy="const x = 1;"/);
    assert.match(html, /<span class="markdown-code-copy-label"><\/span>/);
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

test("renderMarkdown treats leading asterisks as emphasis text, not list bullets", () => {
    const html = renderMarkdown("*hello*");
    assert.equal(html, "<p><em>hello</em></p>");
});

test("renderMarkdown still supports hyphen unordered lists", () => {
    const html = renderMarkdown("- one\n- two");
    assert.equal(html, "<ul>\n<li>one</li>\n<li>two</li>\n</ul>");
});

test("renderMarkdown does not treat leading asterisk bullets as unordered lists", () => {
    const html = renderMarkdown("* item");
    assert.equal(html, "<p>* item</p>");
});
