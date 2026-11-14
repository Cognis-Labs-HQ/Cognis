import test from "node:test";
import assert from "node:assert/strict";
import { rewriteHtmlAssets } from "../../scripts/ui-build/html-assets.mjs";

test("host and component HTML retain stylesheet identity beside emitted asset URLs", () => {
    const html = rewriteHtmlAssets(
        '<link rel="stylesheet" href="/static/styles/page.css"><script type="module" src="/static/page.js"></script>',
        {
            "/static/styles/page.css": "/assets/page-ABCDEFGH.css",
            "/static/page.js": "/assets/page-ABCDEFGH.js",
        },
    );
    assert.match(
        html,
        /href="\/assets\/page-ABCDEFGH.css" data-page-stylesheet-source="\/static\/styles\/page.css"/,
    );
    assert.match(html, /src="\/assets\/page-ABCDEFGH.js"/);
});
