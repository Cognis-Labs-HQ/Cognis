import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import {
    renderDocumentDiff,
    renderMarkdownDocumentDiff,
} from "../document-diff.js";

test("document diff renders additions changes and removals safely", () => {
    const html = renderDocumentDiff({
        lines: [
            {
                type: "removed",
                content: "Old <clause>",
                oldLine: 1,
                newLine: null,
            },
            {
                type: "changed",
                oldContent: "Previous wording",
                newContent: "Updated wording",
                oldLine: 2,
                newLine: 1,
            },
            {
                type: "added",
                content: "New clause",
                oldLine: null,
                newLine: 2,
            },
        ],
    });

    assert.match(html, /document-diff-line--removed/);
    assert.match(html, /document-diff-line--changed-previous/);
    assert.match(html, /document-diff-line--changed-next/);
    assert.match(html, /document-diff-line--added/);
    assert.match(html, /Old &lt;clause&gt;/);
    assert.match(html, /document-diff-overview/);
    assert.match(html, /document-diff-marker--removed/);
    assert.match(html, /document-diff-marker--changed/);
    assert.match(html, /document-diff-marker--added/);
    assert.match(html, /href="#document-diff-\d+-line-1"/);
});

test("document diff renders full Markdown with semantic overlays", () => {
    const html = renderMarkdownDocumentDiff({
        lines: [
            { type: "unchanged", content: "# Terms" },
            { type: "removed", content: "Old **clause**" },
            {
                type: "changed",
                oldContent: "Previous wording",
                newContent: "Updated *wording*",
            },
            { type: "added", content: "New <clause>" },
        ],
    });

    assert.match(html, /<h1>Terms<\/h1>/);
    assert.match(html, /document-diff-markdown-overlay--removed/);
    assert.match(html, /<strong>clause<\/strong>/);
    assert.match(html, /document-diff-markdown-overlay--changed-previous/);
    assert.match(html, /document-diff-markdown-overlay--changed-next/);
    assert.match(html, /Updated <em>wording<\/em>/);
    assert.match(html, /document-diff-markdown-overlay--added/);
    assert.match(html, /New &lt;clause&gt;/);
    assert.match(html, /document-diff-marker--changed/);
});

test("document diff styles use semantic git-style change colors", () => {
    const styles = readFileSync(
        resolve(import.meta.dirname, "../../styles/reuse/document-diff.css"),
        "utf8",
    );

    assert.match(
        styles,
        /document-diff-line--added[^}]*color-success-outline-text/,
    );
    assert.match(
        styles,
        /document-diff-line--changed-previous[^}]*color-warning-outline-text/,
    );
    assert.match(
        styles,
        /document-diff-line--removed[^}]*color-danger-outline-text/,
    );
    assert.match(
        styles,
        /document-diff-marker--changed[^}]*color-warning-outline-text/,
    );
});
