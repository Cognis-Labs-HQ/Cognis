import test from "node:test";
import assert from "node:assert/strict";
import { securityFixture, settleUntil } from "./localization-fixture.js";

const labels = {
    en: ["Password Requirements", "Passwords match."],
    de: ["Passwortanforderungen", "Passwörter stimmen überein."],
    id: ["Persyaratan kata sandi", "Kata sandi cocok."],
    ja: ["パスワード要件", "パスワードが一致します。"],
};
const zeroPolicy = {
    minLength: 0,
    requireUppercase: 0,
    requireLowercase: 0,
    requireDigit: 0,
    requireSpecial: 0,
};

for (const [locale, [heading, match]] of Object.entries(labels)) {
    test(`Security direct load, cancel and remount use shared password labels: ${locale}`, async (context) => {
        const host = await securityFixture(context, { locale });
        assert.equal(host.window.location.hash, "#security");
        const storedPriority = host.window.localStorage.getItem(
            "cognis_language_priority",
        );
        assert.equal(host.document.documentElement.lang, locale);
        for (let attempt = 0; attempt < 2; attempt++) {
            const opening = await host.open();
            assert.ok(opening.overlay.textContent.includes(heading));
            assert.ok(opening.overlay.textContent.includes(match));
            assert.equal(
                opening.overlay.querySelectorAll('input[type="password"]')
                    .length,
                3,
            );
            assert.equal(host.active().length, 1);
            for (const input of opening.overlay.querySelectorAll(
                'input[type="password"]',
            )) {
                assert.equal(input.required, true);
                assert.ok(
                    opening.overlay
                        .querySelector(`label[for="${input.id}"]`)
                        .textContent.trim(),
                );
            }
            assert.equal(
                opening.overlay
                    .querySelector(
                        '[data-form-builder-floating="nextPassword"]',
                    )
                    .getAttribute("aria-live"),
                "polite",
            );
            host.action(opening.overlay, "cancel");
            await opening.result;
            assert.equal(host.active().length, 0);
            await host.mount();
            assert.equal(host.document.documentElement.lang, locale);
            assert.equal(
                host.window.localStorage.getItem("cognis_language_priority"),
                storedPriority,
            );
        }
        assert.equal(
            host.requests.filter(({ options }) => options.method === "POST")
                .length,
            0,
        );
    });
}

for (const omission of [null, ""]) {
    test(`Security falls back to the same English XML keys (${omission === null ? "missing" : "empty"})`, async (context) => {
        const host = await securityFixture(context, {
            locale: "de",
            catalogEdits: {
                de: {
                    "ui.reuse.password_requirements": omission,
                    "ui.reuse.passwords_match": omission,
                },
            },
        });
        const opening = await host.open();
        for (const label of labels.en)
            assert.ok(opening.overlay.textContent.includes(label));
        host.action(opening.overlay, "cancel");
        await opening.result;
    });
    for (const key of [
        "ui.reuse.password_requirements",
        "ui.reuse.passwords_match",
    ]) {
        test(`Security fails explicitly when ${key} has ${omission === null ? "no" : "empty"} English XML`, async (context) => {
            const host = await securityFixture(context, {
                locale: "de",
                catalogEdits: {
                    de: { [key]: omission },
                    en: { [key]: omission },
                },
            });
            await assert.rejects(
                host.open,
                (error) => error.message === `missing_translation:${key}`,
            );
            assert.equal(
                host.requests.filter(({ options }) => options.method === "POST")
                    .length,
                0,
            );
        });
    }
}

test("Security validates all policy criteria and matching passwords before recording one synthetic submission", async (context) => {
    const host = await securityFixture(context);
    host.window.localStorage.setItem(
        "cognis_access_token",
        "synthetic-session",
    );
    const opening = await host.open();
    host.action(opening.overlay, "save");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.active().length, 1);
    assert.equal(host.document.activeElement.name, "currentPassword");
    host.fill(opening.overlay, "currentPassword", " synthetic old password ");
    host.fill(opening.overlay, "nextPassword", "short");
    host.fill(opening.overlay, "confirmPassword", "other");
    host.action(opening.overlay, "save");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.active().length, 1);
    assert.ok(
        opening.overlay
            .querySelector('[name="nextPassword"]')
            .classList.contains("form-builder-input--invalid"),
    );
    host.fill(opening.overlay, "nextPassword", "Synthetic123!");
    host.fill(opening.overlay, "confirmPassword", "Synthetic123!");
    const criterion = opening.overlay.querySelector(
        '[data-form-builder-criterion="confirmPassword:confirm-password-match"]',
    );
    assert.ok(criterion.classList.contains("form-builder-criterion-item--met"));
    host.fill(opening.overlay, "nextPassword", "Changed123!");
    assert.ok(
        criterion.classList.contains("form-builder-criterion-item--unmet"),
    );
    host.fill(opening.overlay, "confirmPassword", "Changed123!");
    host.action(opening.overlay, "save");
    await opening.result;
    const submissions = host.requests.filter(
        ({ options }) => options.method === "POST",
    );
    assert.equal(submissions.length, 1);
    assert.equal(submissions[0].path, "/api/v1/auth/reset-password");
    assert.deepEqual(JSON.parse(submissions[0].options.body), {
        currentPassword: " synthetic old password ",
        password: "Changed123!",
    });
    assert.equal(host.window.localStorage.getItem("cognis_access_token"), null);
    assert.equal(
        host.toasts.at(-1)[0],
        host.i18n.t("gateway.auth.security.reset_success"),
    );
    assert.equal(host.redirects.length, 1);
});

test("Dirty cancellation keeps or discards the form and reopening resets its values", async (context) => {
    const host = await securityFixture(context);
    const opening = await host.open();
    host.fill(opening.overlay, "nextPassword", "Synthetic123!");
    host.action(opening.overlay, "cancel");
    await settleUntil(() => host.active().length === 2);
    host.action(host.active().at(-1), "keep");
    await settleUntil(() => host.active().length === 1);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
        opening.overlay.querySelector('[name="nextPassword"]').value,
        "Synthetic123!",
    );
    host.action(opening.overlay, "cancel");
    await settleUntil(() => host.active().length === 2);
    host.action(host.active().at(-1), "discard");
    await opening.result;
    const reopened = await host.open();
    assert.equal(
        reopened.overlay.querySelector('[name="nextPassword"]').value,
        "",
    );
    host.action(reopened.overlay, "cancel");
    await reopened.result;
    assert.equal(
        host.requests.filter(({ options }) => options.method === "POST").length,
        0,
    );
});

test("A rejected synthetic reset retains the session and displays localized failure", async (context) => {
    const host = await securityFixture(context, {
        locale: "ja",
        resetStatus: 400,
    });
    host.window.localStorage.setItem(
        "cognis_access_token",
        "synthetic-session",
    );
    const opening = await host.open();
    host.fill(opening.overlay, "currentPassword", "SyntheticOld123!");
    host.fill(opening.overlay, "nextPassword", "SyntheticNew123!");
    host.fill(opening.overlay, "confirmPassword", "SyntheticNew123!");
    host.action(opening.overlay, "save");
    await opening.result;
    assert.equal(
        host.window.localStorage.getItem("cognis_access_token"),
        "synthetic-session",
    );
    assert.equal(
        host.toasts.at(-1)[0],
        host.i18n.t("gateway.auth.security.reset_failed"),
    );
    assert.equal(host.redirects.length, 0);
});

test("All-zero wire policy retains the real minimum-length default", async (context) => {
    const host = await securityFixture(context, { policy: zeroPolicy });
    const opening = await host.open();
    assert.ok(opening.overlay.textContent.includes(labels.en[0]));
    assert.equal(
        opening.overlay.querySelectorAll("[data-form-builder-criterion]")
            .length,
        2,
    );
    host.fill(opening.overlay, "currentPassword", "SyntheticOld123!");
    host.fill(opening.overlay, "nextPassword", "short");
    host.fill(opening.overlay, "confirmPassword", "short");
    host.action(opening.overlay, "save");
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.active().length, 1);
    assert.ok(
        opening.overlay
            .querySelector('[name="nextPassword"]')
            .classList.contains("form-builder-input--invalid"),
    );
});

for (const [locale, [, match]] of Object.entries(labels)) {
    test(`Defensive zero-criteria rendering resolves shared XML: ${locale}`, async (context) => {
        const host = await securityFixture(context, {
            policy: zeroPolicy,
            unsupportedZeroCriteria: true,
            locale,
        });
        const opening = await host.open();
        assert.equal(
            opening.overlay.querySelectorAll("[data-form-builder-criterion]")
                .length,
            1,
        );
        assert.ok(opening.overlay.textContent.includes(match));
        host.action(opening.overlay, "cancel");
        await opening.result;
    });
}

for (const omission of [null, ""]) {
    test(`Defensive zero-criteria path rejects ${omission === null ? "missing" : "empty"} English title`, async (context) => {
        const key = "ui.reuse.password_requirements";
        const host = await securityFixture(context, {
            policy: zeroPolicy,
            unsupportedZeroCriteria: true,
            locale: "id",
            catalogEdits: { id: { [key]: omission }, en: { [key]: omission } },
        });
        await assert.rejects(
            host.open,
            (error) => error.message === `missing_translation:${key}`,
        );
    });
}
