import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { renderDocumentDiff } from "../document-diff.js";

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
});

test("document diff styles use semantic git-style change colors", () => {
    const styles = readFileSync(
        resolve(import.meta.dirname, "../../styles/reuse/page-sections.css"),
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
});
