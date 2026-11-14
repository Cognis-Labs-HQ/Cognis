import assert from "node:assert/strict";
import test from "node:test";
import { registrationFixture } from "./fixture.js";

const labels = {
    en: ["Password Requirements", "Passwords match."],
    de: ["Passwortanforderungen", "Passwörter stimmen überein."],
    id: ["Persyaratan kata sandi", "Kata sandi cocok."],
    ja: ["パスワード要件", "パスワードが一致します。"],
};
const selectors = {
    "ui.reuse.password_requirements":
        '[data-form-builder-floating="password"] .form-builder-floating-title',
    "ui.reuse.passwords_match":
        '[data-form-builder-criterion="confirmPassword:confirm-password-match"]',
};

function input(fixture, name, value) {
    const field = fixture.root.querySelector(`[name="${name}"]`);
    field.value = value;
    field.dispatchEvent(new fixture.window.Event("input", { bubbles: true }));
    return field;
}

function criterion(fixture, name) {
    return fixture.root.querySelector(
        `[data-form-builder-criterion="${name}"]`,
    );
}

function assertState(element, state) {
    assert.ok(
        element.classList.contains(`form-builder-criterion-item--${state}`),
        element.outerHTML,
    );
}

function assertNoExternalActions(fixture) {
    assert.deepEqual(fixture.calls, []);
    assert.deepEqual(
        fixture.requests.filter(({ method }) => method !== "GET"),
        [{ url: "/api/v1/auth/logout", method: "POST" }],
        "Only the intercepted synthetic session reset is allowed",
    );
    assert.equal(
        fixture.window.location.href,
        "https://registration.test/register",
    );
}

for (const [locale, expected] of Object.entries(labels)) {
    test(`registration mounts localized shared password labels and live validation in ${locale}`, async (context) => {
        const fixture = await registrationFixture({ locale });
        context.after(() => fixture.close());
        await fixture.mount();
        assert.equal(fixture.window.document.documentElement.lang, locale);
        for (const [index, selector] of Object.values(selectors).entries()) {
            assert.equal(
                fixture.root.querySelector(selector).textContent,
                expected[index],
            );
        }
        assert.equal(
            fixture.root.querySelectorAll(
                '[data-form-builder-criterion^="password:"]',
            ).length,
            5,
        );
        const password = input(fixture, "password", "short");
        const requirements = [
            "password-min-length",
            "password-uppercase-count",
            "password-digit-count",
            "password-special-count",
        ];
        for (const requirement of requirements) {
            assertState(criterion(fixture, `password:${requirement}`), "unmet");
        }
        assertState(
            criterion(fixture, "password:password-lowercase-required"),
            "met",
        );
        assert.equal(
            password.classList.contains("form-builder-input--invalid"),
            true,
        );
        input(fixture, "password", "UPPERCASE1!");
        assertState(
            criterion(fixture, "password:password-lowercase-required"),
            "unmet",
        );
        input(fixture, "password", "Synthetic1!");
        for (const item of fixture.root.querySelectorAll(
            '[data-form-builder-criterion^="password:"]',
        )) {
            assertState(item, "met");
        }
        assert.equal(
            password.classList.contains("form-builder-input--invalid"),
            false,
        );
        const confirmation = input(fixture, "confirmPassword", "Different1!");
        const match = criterion(
            fixture,
            "confirmPassword:confirm-password-match",
        );
        assertState(match, "unmet");
        assert.equal(
            confirmation.classList.contains("form-builder-input--invalid"),
            true,
        );
        input(fixture, "confirmPassword", "Synthetic1!");
        assertState(match, "met");
        assert.equal(
            confirmation.classList.contains("form-builder-input--invalid"),
            false,
        );
        input(fixture, "password", "ChangedValue2!");
        assertState(match, "unmet");
        assertNoExternalActions(fixture);
    });
}

for (const [index, [key, selector]] of Object.entries(selectors).entries()) {
    for (const value of [null, ""]) {
        test(`registration uses same-key English XML when German ${key} is ${value === null ? "missing" : "empty"}`, async (context) => {
            const fixture = await registrationFixture({
                locale: "de",
                edits: [{ locale: "de", key, value }],
            });
            context.after(() => fixture.close());
            await fixture.mount();
            assert.equal(
                fixture.root.querySelector(selector).textContent,
                labels.en[index],
            );
            const otherIndex = 1 - index;
            assert.equal(
                fixture.root.querySelector(Object.values(selectors)[otherIndex])
                    .textContent,
                labels.de[otherIndex],
            );
            assertNoExternalActions(fixture);
        });

        test(`registration rejects unavailable ${key} when English XML is ${value === null ? "missing" : "empty"}`, async (context) => {
            const fixture = await registrationFixture({
                locale: "de",
                edits: [
                    { locale: "de", key, value: null },
                    { locale: "en", key, value },
                ],
            });
            context.after(() => fixture.close());
            await assert.rejects(fixture.mount(), (error) => {
                assert.equal(error.code, "missing_translation");
                assert.equal(error.key, key);
                assert.equal(error.message, `missing_translation:${key}`);
                return true;
            });
            assertNoExternalActions(fixture);
        });
    }
}
