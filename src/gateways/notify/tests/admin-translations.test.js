import test from "node:test";
import assert from "node:assert/strict";
import { environment } from "./fixtures/administration.js";

for (const [locale, labels] of Object.entries({
    en: ["Enabled", "Disabled"],
    de: ["Aktiviert", "Deaktiviert"],
    id: ["Aktif", "Nonaktif"],
    ja: ["有効", "無効"],
})) {
    test(`Broadcast status renders actual ${locale} catalog labels`, async (context) => {
        const fixture = await environment("broadcasts", { locale });
        context.after(fixture.close);
        assert.deepEqual(
            [...fixture.root.querySelectorAll(".state-pill")].map(
                (element) => element.textContent,
            ),
            labels,
        );
    });
}

test("Broadcast status falls back to English when the preferred keys are absent", async (context) => {
    const fixture = await environment("broadcasts", {
        locale: "de",
        omitKeys: { de: ["ui.reuse.enabled", "ui.reuse.disabled"] },
    });
    context.after(fixture.close);
    assert.deepEqual(
        [...fixture.root.querySelectorAll(".state-pill")].map(
            (element) => element.textContent,
        ),
        ["Enabled", "Disabled"],
    );
});

for (const key of ["ui.reuse.enabled", "ui.reuse.disabled"]) {
    test(`Broadcast rendering fails explicitly when ${key} has no English fallback`, async (context) => {
        const fixture = await environment("broadcasts", {
            locale: "de",
            mount: false,
            omitKeys: { de: [key], en: [key] },
        });
        context.after(fixture.close);
        assert.throws(fixture.render, {
            message: `missing_translation:${key}`,
        });
        assert.equal(fixture.writes().length, 0);
    });
}
