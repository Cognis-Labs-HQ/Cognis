import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readRegistrationUi = (relativePath) =>
    readFile(new URL(`../ui/${relativePath}`, import.meta.url), "utf8");

test("registration administration owns policy and invite navigation", async () => {
    const source = await readRegistrationUi("admin-section.js");
    assert.match(source, /createFormBuilder/);
    assert.match(source, /createFormDirtyTracker/);
    assert.match(source, /publicRegistrationEnabled/);
    assert.match(source, /gateways\/registration\/adapters\/public/);
    assert.match(source, /class="btn-neutral btn-animated" href="\/invite"/);
});

test("registration gateway owns the invite management page and styles", async () => {
    const [source, styles, page] = await Promise.all([
        readRegistrationUi("app/invite/index.js"),
        readRegistrationUi("app/invite/index.css"),
        readRegistrationUi("pages/invite.html"),
    ]);
    assert.match(source, /gateway\.registration\.send_invite_email/);
    assert.match(source, /gateway\.registration\.generate_registration_token/);
    assert.match(source, /renderSecretVisibilityField/);
    assert.match(source, /copyTextToClipboard/);
    assert.match(source, /refreshElements\(\["invite-tokens"\]\)/);
    assert.match(styles, /\.invite-token-target/);
    assert.match(source, /await ensurePageStylesheet/);
    assert.match(
        page,
        /static\/gateways\/registration\/app\/invite\/index\.js/,
    );
    assert.match(
        page,
        /static\/gateways\/registration\/app\/invite\/index\.css/,
    );
});

test("registration gateway owns registration page composition", async () => {
    const [source, form, authorization, page] = await Promise.all([
        readRegistrationUi("register/index.js"),
        readRegistrationUi("register/form.js"),
        readRegistrationUi("register/authorization.js"),
        readRegistrationUi("pages/register.html"),
    ]);
    assert.match(source, /createFormBuilder/);
    assert.match(form, /export function buildPasswordCriteria/);
    assert.match(authorization, /renderAccountCreationAuthorization/);
    assert.match(
        source,
        /componentStringBaseUrls:[\s\S]*gateways\/auth\/languages[\s\S]*gateways\/registration\/languages/,
    );
    assert.match(page, /static\/gateways\/registration\/register\/index\.js/);
});
