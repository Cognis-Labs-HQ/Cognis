import assert from "node:assert/strict";
import test from "node:test";
import { guides } from "../../app/administration/guides.js";
import {
    associatedName,
    controlKeys,
    securityRenderFixture,
} from "./fixtures/security-render.js";

const switches = [
    "security-require-teacher-approval",
    "security-enforce-tfa-for-all-users",
];

for (const locale of ["en", "de", "id", "ja"]) {
    for (const reverseStyles of [false, true]) {
        test(`${locale} Security names follow visible labels across repeated renders, style order ${reverseStyles}`, async (context) => {
            const state = await securityRenderFixture(context, locale, {
                reverseStyles,
            });
            for (let lifetime = 0; lifetime < 3; lifetime++) {
                state.render();
                for (const [id, key] of Object.entries(controlKeys)) {
                    const input = state.securityRoot.querySelector(`#${id}`);
                    const expected = id.endsWith("-unit")
                        ? `${state.i18n.t(controlKeys["security-login-session-timeout"])} ${state.i18n.t(key)}`
                        : state.i18n.t(key);
                    assert.equal(associatedName(input), expected);
                    const labels = [...input.labels];
                    assert.ok(
                        labels.some(
                            (label) =>
                                label.textContent.trim() === state.i18n.t(key),
                        ),
                    );
                    assert.ok(
                        labels.every((label) => !label.querySelector("button")),
                    );
                    assert.equal(
                        input.disabled,
                        true,
                        "Render-only controls remain disabled before initialization",
                    );
                }
                const amount = state.securityRoot.querySelector(
                    "#security-login-session-timeout",
                );
                const unit = state.securityRoot.querySelector(
                    "#security-login-session-timeout-unit",
                );
                assert.notEqual(associatedName(amount), associatedName(unit));
                assert.equal(amount.type, "number");
                assert.equal(amount.min, "1");
                assert.equal(amount.step, "1");
                assert.deepEqual(
                    [...unit.options].map((option) => option.value),
                    ["minutes", "hours", "days", "weeks", "never"],
                );
                const policy = state.securityRoot.querySelector(
                    "#security-policy-min-length",
                );
                assert.equal(
                    associatedName(policy),
                    state.i18n.t("ui.app.admin.security.policy_min_length"),
                );
                for (const button of state.securityRoot.querySelectorAll(
                    ".info-tooltip__btn",
                )) {
                    assert.equal(
                        button.getAttribute("aria-label"),
                        state.i18n.t("ui.reuse.more_information"),
                    );
                    assert.equal(button.closest("label"), null);
                }
                const securityGuide = guides[0].definitions.find(
                    (guide) => guide.id === "security",
                );
                for (const step of securityGuide.steps) {
                    assert.equal(
                        state.securityRoot.querySelectorAll(step.selector)
                            .length,
                        1,
                    );
                    assert.equal(typeof step.highlightNext, "boolean");
                }
                assert.equal(state.security.isDirty(), false);
            }
        });

        test(`${locale} native switch presentation retains labels, focus declarations and protected rows, style order ${reverseStyles}`, async (context) => {
            const state = await securityRenderFixture(context, locale, {
                reverseStyles,
            });
            state.render();
            for (const id of switches) {
                const input = state.securityRoot.querySelector(`#${id}`);
                const label = state.securityRoot.querySelector(
                    `label[for="${id}"]`,
                );
                const slider = input.nextElementSibling;
                const button = input
                    .closest(".components-section")
                    .querySelector("button");
                const style = state.window.getComputedStyle(input);
                assert.equal(input.type, "checkbox");
                assert.equal(input.tabIndex, 0);
                assert.equal(input.getAttribute("role"), null);
                assert.equal(input.getAttribute("aria-hidden"), null);
                assert.equal(slider.tabIndex, -1);
                assert.equal(style.display, "block");
                assert.equal(style.visibility, "visible");
                assert.equal(style.position, "absolute");
                assert.equal(style.opacity, "0");
                assert.equal(style.width, "100%");
                assert.equal(style.height, "100%");
                assert.equal(
                    state.window.getComputedStyle(input.parentElement).position,
                    "relative",
                );
                assert.equal(
                    state.window.getComputedStyle(slider).opacity,
                    "0.45",
                );
                assert.equal(style.cursor, "not-allowed");
                let changes = 0;
                input.addEventListener("change", () => changes++);
                label.click();
                assert.equal(input.checked, false);
                assert.equal(changes, 0);
                input.disabled = false;
                label.click();
                assert.equal(input.checked, true);
                assert.equal(
                    changes,
                    1,
                    "The visible heading activates its native checkbox exactly once",
                );
                button.click();
                assert.equal(input.checked, true);
                assert.equal(
                    changes,
                    1,
                    "Tooltip activation never activates the checkbox",
                );
                input.parentElement.click();
                assert.equal(input.checked, false);
                assert.equal(
                    changes,
                    2,
                    "The visible slider wrapper retains native label activation",
                );
                const unchecked =
                    state.window.getComputedStyle(slider).background;
                input.checked = true;
                assert.notEqual(
                    state.window.getComputedStyle(slider).background,
                    unchecked,
                );
                input.focus();
                assert.equal(
                    state.window.document.activeElement,
                    input,
                    "DOM focus can reach the exposed native input",
                );
            }
            const focusRule = [...state.window.document.styleSheets]
                .flatMap((sheet) => [...sheet.cssRules])
                .find(
                    (rule) =>
                        rule.selectorText ===
                        ".switch input:focus-visible + .slider",
                );
            assert.ok(focusRule);
            assert.equal(
                focusRule.style.getPropertyValue("outline"),
                "2px solid var(--accent, #3b82f6)",
            );
            assert.equal(
                focusRule.style.getPropertyValue("outline-offset"),
                "3px",
            );
            for (const locked of [false, true, false]) {
                state.renderRows(locked);
                const inputs = [
                    ...state.componentsRoot.querySelectorAll(".switch input"),
                ];
                assert.equal(inputs.length, 2);
                for (const input of inputs) {
                    assert.ok(input.getAttribute("aria-label"));
                    assert.equal(input.disabled, locked);
                    assert.equal(input.checked, true);
                    assert.equal(
                        state.window.getComputedStyle(input).display,
                        "block",
                    );
                    assert.equal(
                        state.window.getComputedStyle(input).height,
                        "100%",
                    );
                    assert.equal(
                        state.window.getComputedStyle(input.parentElement)
                            .minHeight,
                        "44px",
                    );
                }
            }
            state.render();
            assert.ok(
                [...state.securityRoot.querySelectorAll(".switch input")].every(
                    (input) => input.disabled && !input.checked,
                ),
            );
            assert.equal(state.security.isDirty(), false);
        });
    }
}

for (const key of Object.values(controlKeys)) {
    for (const option of ["omitKeys", "emptyKeys"]) {
        test(`Security name ${key} uses English when preferred text is ${option}`, async (context) => {
            const state = await securityRenderFixture(context, "de", {
                [option]: { de: [key] },
            });
            state.render();
            const id = Object.keys(controlKeys).find(
                (id) => controlKeys[id] === key,
            );
            const input = state.securityRoot.querySelector(`#${id}`);
            const english = state.englishStrings.get(key);
            assert.ok(english);
            assert.ok(associatedName(input).includes(english));
            assert.equal(state.i18n.t(key), english);
            assert.equal(state.i18n.locale, "de");
        });

        test(`Security name ${key} rejects English that is ${option}`, async (context) => {
            const state = await securityRenderFixture(context, "de", {
                [option]: { de: [key], en: [key] },
            });
            assert.throws(state.render, { code: "missing_translation", key });
        });
    }
}
