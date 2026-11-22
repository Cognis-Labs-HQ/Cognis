import assert from "node:assert/strict";
import test from "node:test";

import { createCollapsibleSectionComposer } from "../collapsible-section-composer.js";

test("collapsible section composer renders descriptor payloads with aligned actions", () => {
    const composer = createCollapsibleSectionComposer({
        escapeHtml: (value) => String(value).replaceAll("<", "&lt;"),
        detailsLabel: "Mehr Details",
    });
    const html = composer.render([
        {
            id: "terms",
            title: "Terms <current>",
            controlsHtml: "<button>Compose</button><button>Preview</button>",
            contentHtml: "<p>Document editor</p>",
        },
    ]);

    assert.match(html, /data-collapsible-section="terms"/);
    assert.match(html, /Terms &lt;current>/);
    assert.match(html, /collapsible-section-action-row/);
    assert.match(html, /<button>Compose<\/button><button>Preview<\/button>/);
    assert.match(html, /<p>Document editor<\/p>/);
    assert.match(html, /aria-label="Mehr Details"/);
});

test("collapsible section composer loads asynchronous payload providers", async () => {
    const composer = createCollapsibleSectionComposer({
        detailsLabel: "Details",
    });
    const html = await composer.load(async () => [
        { id: "privacy", title: "Privacy", contentHtml: "Policy" },
    ]);

    assert.match(html, /data-collapsible-section="privacy"/);
    assert.match(html, />Policy<\/div>/);
});

test("collapsible section composer requires a localized disclosure label", () => {
    assert.throws(
        () => createCollapsibleSectionComposer(),
        /detailsLabel is required/,
    );
});
