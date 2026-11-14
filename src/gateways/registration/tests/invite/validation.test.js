import test from "node:test";
import assert from "node:assert/strict";
import { fixture, settle } from "./fixture.js";

for (const value of [
    "",
    "   ",
    "not-an-address",
    "someone@",
    "a@@fixture.invalid",
]) {
    for (const action of ["click", "Enter"]) {
        test(`${action} explains invalid invitation email ${JSON.stringify(value)} without creating`, async (context) => {
            const host = await fixture(context);
            const overlay = await host.open();
            const input = host.edit(value);
            const retained = input.value;
            if (action === "click") host.create();
            else host.key("Enter");
            await settle();
            assert.equal(host.creations.length, 0);
            assert.equal(host.active(), overlay);
            assert.equal(host.document.activeElement, input);
            assert.equal(input.value, retained);
            assert.equal(input.getAttribute("aria-invalid"), "true");
            const description = host.document.getElementById(
                input.getAttribute("aria-describedby"),
            );
            assert.ok(description?.textContent.trim());
            assert.equal(host.toast(), description.textContent.trim());
            assert.equal(input.labels.length, 1);
            assert.match(input.labels[0].textContent, /Email address/);
        });
    }
}
