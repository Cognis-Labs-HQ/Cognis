import test from "node:test";
import assert from "node:assert/strict";
import { fixture, settle } from "./fixture.js";

const expected = {
    en: [
        "Enter the invitation recipient’s email address.",
        "Enter a valid email address for the invitation recipient.",
    ],
    de: [
        "Gib die E-Mail-Adresse der eingeladenen Person ein.",
        "Gib eine gültige E-Mail-Adresse für die eingeladene Person ein.",
    ],
    id: [
        "Masukkan alamat email penerima undangan.",
        "Masukkan alamat email yang valid untuk penerima undangan.",
    ],
    ja: [
        "招待先のメールアドレスを入力してください。",
        "招待先の有効なメールアドレスを入力してください。",
    ],
};
for (const [locale, messages] of Object.entries(expected)) {
    test(`${locale} localizes associated required and invalid recipient feedback`, async (context) => {
        const host = await fixture(context, { locale });
        await host.open();
        for (const [index, value] of ["", "invalid"].entries()) {
            const input = host.edit(value);
            host.create();
            await settle();
            assert.equal(host.toast(), messages[index]);
            assert.equal(
                host.document.getElementById(
                    input.getAttribute("aria-describedby"),
                ).textContent,
                messages[index],
            );
        }
    });
}

const validationKeys = [
    "gateway.registration.invite.email_required",
    "gateway.registration.invite.email_invalid",
];
for (const locale of ["de", "id", "ja"]) {
    for (const [index, key] of validationKeys.entries()) {
        test(`${locale} mounted action uses same-key English fallback for ${key}`, async (context) => {
            const host = await fixture(context, {
                locale,
                omitKeys: { [locale]: [key] },
            });
            await host.open();
            host.edit(index === 0 ? "" : "invalid");
            host.create();
            await settle();
            assert.equal(host.toast(), expected.en[index]);
            assert.equal(host.creations.length, 0);
        });
    }
}

for (const locale of Object.keys(expected)) {
    for (const key of validationKeys) {
        test(`${locale} mounted invitation click preserves missing English ${key}`, async (context) => {
            const host = await fixture(context, {
                locale,
                omitKeys: { [locale]: [key], en: [key] },
            });
            const trigger = host.root.querySelector("#invite-email-btn");
            for (let attempt = 0; attempt < 2; attempt += 1) {
                trigger.click();
                await settle();
                const errors = host.takeActionErrors();
                assert.equal(errors.length, 1);
                assert.equal(errors[0].code, "missing_translation");
                assert.equal(errors[0].key, key);
                assert.equal(errors[0].message, `missing_translation:${key}`);
                assert.equal(host.active(), null);
                assert.equal(host.creations.length, 0);
                assert.equal(host.refreshes(), 0);
                assert.equal(host.toast(), undefined);
                assert.equal(
                    host.logs.some(
                        (entry) =>
                            entry.args[1]?.operation ===
                            "createInvitationEmail",
                    ),
                    false,
                );
            }
        });
    }
}
