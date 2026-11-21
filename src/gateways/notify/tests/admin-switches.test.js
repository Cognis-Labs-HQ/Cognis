import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { environment, response } from "./fixtures/administration.js";

const stylesheets = [
    new URL("../../../ui/styles/page-builder/admin.css", import.meta.url),
    new URL("../ui/broadcast-admin.css", import.meta.url),
].map((url) => readFileSync(url, "utf8"));

const switches = [
    [
        "broadcastRequireAck",
        "gateway.notify.admin.broadcast_require_ack",
        false,
    ],
    [
        "broadcastEnabled",
        "gateway.notify.admin.broadcast_enable_immediately",
        true,
    ],
];

async function switchEnvironment(locale, reverseStyles) {
    const fixture = await environment("broadcasts", {
        locale,
        rows: [],
        intercept(request) {
            assert.equal(
                request.method,
                "GET",
                "Switch drafts must not submit",
            );
            assert.ok(
                ["/api/v1/users", "/api/v1/notify/broadcasts"].includes(
                    request.url,
                ),
            );
            return response([]);
        },
    });
    const document = fixture.window.document;
    for (const css of reverseStyles
        ? [...stylesheets].reverse()
        : stylesheets) {
        const style = document.createElement("style");
        style.textContent = css;
        document.head.append(style);
    }
    return fixture;
}

function assertExposed(fixture, input) {
    const computed = fixture.window.getComputedStyle(input);
    assert.equal(input.type, "checkbox");
    assert.equal(input.hidden, false);
    assert.equal(input.getAttribute("aria-hidden"), null);
    assert.equal(input.tabIndex, 0);
    assert.notEqual(computed.display, "none");
    assert.notEqual(computed.visibility, "hidden");
    assert.equal(computed.position, "absolute");
    assert.equal(computed.opacity, "0");
    assert.notEqual(computed.pointerEvents, "none");
    assert.equal(input.nextElementSibling.className, "slider");
}

for (const locale of ["en", "de", "id", "ja"]) {
    for (const reverseStyles of [false, true]) {
        const label = `${locale}, ${reverseStyles ? "Broadcast first" : "Administration first"}`;

        test(`Broadcast native switch labels and CSS exposure: ${label}`, async (context) => {
            const fixture = await switchEnvironment(locale, reverseStyles);
            context.after(fixture.close);
            assert.equal(
                fixture.root.querySelectorAll(".switch input").length,
                2,
            );
            for (const [name, key, checked] of switches) {
                const input = fixture.field(name);
                assertExposed(fixture, input);
                assert.equal(input.disabled, false);
                assert.equal(input.checked, checked);
                assert.equal(input.labels.length, 1);
                assert.equal(
                    input.labels[0].textContent.trim(),
                    fixture.i18n.t(key),
                );
            }
            const roles = [
                ...fixture.root.querySelectorAll('[name="broadcastRoles"]'),
            ];
            assert.equal(roles.length, 5);
            for (const input of roles) {
                assert.equal(input.type, "checkbox");
                assert.ok(input.labels[0].textContent.trim());
                assert.notEqual(
                    fixture.window.getComputedStyle(input).display,
                    "none",
                );
            }
            // CSSOM verifies the focus declaration, not painted focus or native keyboard traversal.
            const focusRule = [...fixture.window.document.styleSheets]
                .flatMap((sheet) => [...sheet.cssRules])
                .find(
                    (rule) =>
                        rule.selectorText ===
                        ".switch input:focus-visible + .slider",
                );
            assert.ok(
                focusRule,
                "The displayed switch must have a focus-visible rule",
            );
            assert.match(focusRule.style.outline, /\bsolid\b/);
            assert.ok(parseFloat(focusRule.style.outline) > 0);
            assert.ok(
                parseFloat(focusRule.style.getPropertyValue("outline-offset")) >
                    0,
            );
            assert.deepEqual(fixture.writes(), []);
        });

        test(`Broadcast label activation preserves switch drafts and Discard: ${label}`, async (context) => {
            const fixture = await switchEnvironment(locale, reverseStyles);
            context.after(fixture.close);
            for (let cycle = 0; cycle < 3; cycle++) {
                for (const [name, , initial] of switches) {
                    const input = fixture.field(name);
                    assertExposed(fixture, input);
                    assert.equal(input.checked, initial);
                    let changes = 0;
                    input.addEventListener("change", () => {
                        changes++;
                    });
                    input.labels[0]
                        .querySelector(".notif-broadcast-toggle-label")
                        .click();
                    assert.equal(input.checked, !initial);
                    assert.equal(
                        changes,
                        1,
                        "A label click changes the checkbox exactly once",
                    );
                    input.disabled = true;
                    input.labels[0].click();
                    input.click();
                    assert.equal(input.checked, !initial);
                    assert.equal(
                        changes,
                        1,
                        "A disabled checkbox rejects label and input activation",
                    );
                    assertExposed(fixture, input);
                    assert.equal(
                        fixture.window.getComputedStyle(
                            input.nextElementSibling,
                        ).opacity,
                        "0.45",
                    );
                    input.disabled = false;
                }
                assert.equal(fixture.section.isDirty(), true);
                fixture.unmount();
                fixture.render();
                fixture.render();
                for (const [name, , initial] of switches) {
                    assert.equal(fixture.field(name).checked, !initial);
                    assert.equal(fixture.field(name).disabled, false);
                    assertExposed(fixture, fixture.field(name));
                }
                fixture.section.discard();
                fixture.render();
                assert.equal(fixture.section.isDirty(), false);
                for (const [name, , initial] of switches) {
                    assert.equal(fixture.field(name).checked, initial);
                }
            }
            assert.deepEqual(fixture.writes(), []);
            assert.equal(fixture.window.localStorage.length, 1);
        });
    }
}
