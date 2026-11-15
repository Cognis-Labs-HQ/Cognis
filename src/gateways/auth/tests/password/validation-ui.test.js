import test from "node:test";
import assert from "node:assert/strict";
import {
    formValidationFixture,
    descriptions,
} from "../../../../ui/tests/fixtures/form-validation.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`password popup exposes real criteria and cancellation stays read-only: ${locale}`, async (context) => {
        const host = await formValidationFixture(context, locale);
        const { openPasswordChangePopup } =
            await import("../../ui/security-prefs/password-change.js");
        const requests = [];
        const policy = {
            minLength: 8,
            requireUppercase: 1,
            requireLowercase: 1,
            requireDigit: 1,
            requireSpecial: 1,
        };
        for (let opening = 0; opening < 2; opening++) {
            await openPasswordChangePopup({
                i18n: host.i18n,
                apiFetch: async (path, options = {}) => {
                    requests.push({ path, method: options.method ?? "GET" });
                    assert.equal(path, "/api/v1/auth/password-policy");
                    assert.equal(options.method ?? "GET", "GET");
                    return new Response(JSON.stringify({ data: policy }));
                },
                showToast: () =>
                    assert.fail(
                        "Cancellation must not display result feedback",
                    ),
                openPopup: async (options) => {
                    const overlay = host.document.createElement("section");
                    overlay.innerHTML = options.body();
                    host.document.body.append(overlay);
                    options.onOpen(overlay);
                    const form = overlay.querySelector("form");
                    const confirmation = host.input(
                        form,
                        "confirmPassword",
                        "different",
                    );
                    assert.equal(
                        confirmation.getAttribute("aria-invalid"),
                        null,
                        "Confirmation criterion stays neutral until the new value exists",
                    );
                    const next = host.input(form, "nextPassword", "weak");
                    assert.equal(next.getAttribute("aria-invalid"), "true");
                    assert.equal(
                        confirmation.getAttribute("aria-invalid"),
                        "true",
                    );
                    const unmet = [
                        ...form.querySelectorAll(
                            '[data-form-builder-field="nextPassword"] .form-builder-criterion-item--unmet',
                        ),
                    ];
                    assert.equal(unmet.length, 4);
                    assert.deepEqual(
                        descriptions(next),
                        unmet.map((criterion) => criterion.id),
                    );
                    assert.ok(
                        unmet.some(
                            (criterion) =>
                                criterion.textContent ===
                                host.i18n
                                    .t(
                                        "gateway.auth.security.password_too_short",
                                    )
                                    .replace("{min}", "8"),
                        ),
                    );
                    assert.deepEqual(descriptions(confirmation), [
                        form.querySelector(
                            '[data-form-builder-criterion="confirmPassword:confirm-password-match"]',
                        ).id,
                    ]);
                    host.input(form, "nextPassword", "Fixture123!");
                    host.input(form, "confirmPassword", "Fixture123!");
                    assert.equal(next.getAttribute("aria-invalid"), null);
                    assert.equal(
                        confirmation.getAttribute("aria-invalid"),
                        null,
                    );
                    assert.equal(options.onAction("cancel"), true);
                    overlay.remove();
                    return "cancel";
                },
            });
        }
        assert.deepEqual(
            requests,
            Array.from({ length: 2 }, () => ({
                path: "/api/v1/auth/password-policy",
                method: "GET",
            })),
        );
    });
}
