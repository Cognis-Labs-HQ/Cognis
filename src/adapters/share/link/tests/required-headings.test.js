import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createFormBuilder } from "../../../../ui/reuse/form-builder.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

const { renderPasswordProtectionField } = loadTestModule(
    new URL("../ui/share-links-popup/rendering.js", import.meta.url),
    {
        "/static/reuse/ui-ctx.js": {},
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/popup.js": {},
        "/static/reuse/timestamp.js": {},
        "/static/reuse/clipboard.js": {},
        "/static/reuse/form-builder.js": { createFormBuilder },
        "/static/reuse/info-tooltip.js": {
            renderInfoTooltip: (text) =>
                `<button type="button" class="info-tooltip__btn">${escapeHtml(text)}</button>`,
        },
        "/static/reuse/secret-visibility-toggle.js": {},
    },
);

test("Share embeds the real builder heading intact beneath its grid-label form", () => {
    const css = readFileSync(
        new URL("../ui/share-links-popup/index.css", import.meta.url),
        "utf8",
    );
    assert.match(css, /\.share-links-create-form label\s*\{\s*display: grid;/);
    const labels = {
        password: "Password Protection",
        passwordRequiredInfo: "Required for this link",
        moreInformation: "More information",
        passwordPlaceholder: "Password",
        generatePassword: "Generate password",
    };
    for (const required of [true, false, true]) {
        for (const method of ["link", "user"]) {
            const markup = renderPasswordProtectionField(labels, {
                passwordRequired: required,
                activeMethodId: method,
                password: "retained secret",
            });
            const label = markup.match(
                /<label for="form-builder-password">(.*?)<\/label>/s,
            )?.[1];
            assert.equal(
                label,
                `<span class="form-builder-label-heading"><span class="form-builder-label-content">Password Protection</span>${required ? '<span class="form-builder-required-flag" data-form-builder-required="password" aria-hidden="true">&#160;*</span>' : ""}</span>`,
            );
            assert.equal(
                markup.includes("info-tooltip__btn"),
                required && method === "link",
            );
            assert.match(
                markup,
                /type="password"[\s\S]*value="retained secret"/,
            );
            assert.match(markup, /autocomplete="new-password"/);
            assert.equal(
                /placeholder="Password" required/.test(markup),
                required,
            );
        }
    }
});
