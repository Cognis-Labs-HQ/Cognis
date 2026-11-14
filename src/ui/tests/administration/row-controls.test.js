import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { renderComponentsContent } from "../../app/administration/render-components.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { installI18nEnvironment } from "../../reuse/tests/fixtures/i18n-environment.js";
import { adapterCompositeKey } from "../../app/administration/adapter-controls.js";
import { isModuleEnabled } from "../../app/administration/toggle-flows.js";
import { Control, localizedRows, rowFixture } from "./fixtures/rows.js";

const styles = readFileSync(
    new URL("../../styles/page-builder/admin.css", import.meta.url),
    "utf8",
);

function declarations(selector, source = styles) {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = source.match(
        new RegExp(`(?:^|\\n)[ \t]*${escaped}\\s*\\{([^}]+)\\}`),
    );
    assert.ok(match, `Style rule exists: ${selector}`);
    return Object.fromEntries(
        match[1]
            .trim()
            .split(";")
            .filter((item) => item.trim())
            .map((item) => item.trim().split(/:\s*/, 2)),
    );
}

for (const locale of ["de", "en", "id", "ja"]) {
    for (const health of ["ok", "warning", "error"]) {
        test(`${locale} ${health} rows retain localized controls, titles and full versions`, () => {
            const { html, gateway, adapter, version, i18n } = localizedRows(
                locale,
                {
                    health,
                },
            );
            const { rows } = rowFixture(html);
            assert.equal(rows.length, 2);
            assert.ok(html.includes(gateway.name));
            assert.ok(html.includes(adapter.name));
            assert.equal(
                html.split(`module-detail-value">${version}</span>`).length - 1,
                2,
            );
            assert.equal(
                html.split(
                    `aria-label="${i18n.t(health === "ok" ? "ui.reuse.healthy" : `ui.reuse.${health}`)}"`,
                ).length - 1,
                2,
            );
            for (const row of rows) {
                assert.equal(row.open, false);
                assert.equal(row.input.checked, true);
                assert.equal(row.input.disabled, false);
                assert.ok(
                    row.input.attributes["aria-label"].startsWith(
                        i18n.t(
                            row.dataset.adapterId
                                ? "ui.app.admin.toggle_adapter"
                                : "ui.app.admin.toggle_gateway",
                        ),
                    ),
                );
            }
            const controls = [
                ...html.matchAll(
                    /<div class="collapsible-section-action-row ([^"]+)">([\s\S]*?)<\/div>/g,
                ),
            ];
            assert.equal(controls.length, 2);
            for (const [, classes, markup] of controls) {
                assert.ok(classes.includes("module-row-controls"));
                assert.equal(
                    [...markup.matchAll(/class="state-pill /g)].length,
                    1,
                );
                assert.equal(
                    [...markup.matchAll(/class="component-health-light /g)]
                        .length,
                    1,
                );
                assert.equal([...markup.matchAll(/<label /g)].length, 1);
            }
        });
    }
}

test("power protection survives expansion and authoritative state refresh", async () => {
    const { html, gateway, adapter } = localizedRows("de", { locked: true });
    const state = rowFixture(html);
    state.bindings.bindDetailsToggleClicks(state.root);
    const options = {
        root: state.root,
        moduleById: new Map(),
        gatewayById: new Map([[gateway.id, gateway]]),
        adapterByCompositeKey: new Map([
            [adapterCompositeKey(gateway.id, adapter.id), adapter],
        ]),
        adapterCompositeKey,
        isModuleEnabled,
    };
    for (const row of state.rows) {
        assert.equal(row.input.disabled, true);
        await row.disclosure.fire("keydown", { key: "Enter" });
        assert.equal(row.open, true);
        assert.equal(row.input.checked, true);
        assert.equal(row.input.disabled, true);
    }
    gateway.required = false;
    gateway.status = "disabled";
    adapter.locked = false;
    adapter.active = false;
    state.runtime.syncRuntimeToggleControls(options);
    assert.equal(state.rows[0].input.disabled, false);
    assert.equal(state.rows[1].input.disabled, true);
    assert.ok(state.rows.every((row) => !row.input.checked && row.open));
    gateway.status = "active";
    state.runtime.syncRuntimeToggleControls(options);
    assert.equal(state.rows[1].input.disabled, false);
    assert.equal(state.rows[1].input.checked, false);
});

test("disclosure click and keyboard activation stay independent from power controls", async () => {
    const { html } = localizedRows();
    const state = rowFixture(html);
    state.bindings.bindDetailsToggleClicks(state.root);
    state.bindings.bindSummarySliderClicks(state.root);
    state.bindings.bindExpandedStateListeners(state.root);
    for (const row of state.rows) {
        for (const [type, key] of [
            ["click"],
            ["keydown", " "],
            ["keydown", "Enter"],
        ]) {
            const previous = row.open;
            const event = await row.disclosure.fire(type, { key });
            assert.equal(row.open, !previous);
            assert.equal(event.defaultPrevented, true);
            assert.equal(event.propagationStopped, true);
            assert.equal(row.input.checked, true);
        }
        const ignored = await row.disclosure.fire("keydown", { key: "Tab" });
        assert.equal(ignored.defaultPrevented, false);
        assert.equal(row.open, true);
        const click = await row.label.fire("click");
        assert.equal(click.propagationStopped, true);
        assert.equal(click.defaultPrevented, false);
        assert.equal(row.open, true);
        await row.fire("toggle");
    }
    for (const row of state.rows) row.open = false;
    state.bindings.restoreExpandedState(state.root);
    assert.ok(state.rows.every((row) => row.open));
});

test("pending power confirmation leaves disclosure available and cancellation restores the switch", async () => {
    const state = rowFixture(localizedRows().html);
    const row = state.rows[0];
    row.input.dataset.module = "example-module";
    let finishConfirmation;
    let requested = false;
    const { bindModuleToggles } = loadTestModule(
        new URL(
            "../../app/administration/bind-module-controls.js",
            import.meta.url,
        ),
        {},
        { HTMLInputElement: Control },
    );
    const root = { querySelectorAll: () => [row.input] };
    bindModuleToggles(root, {
        getState: () => ({ i18n: { t: (key) => key } }),
        openPopup: () =>
            new Promise((resolve) => {
                finishConfirmation = resolve;
            }),
        toggleModule: () => {
            requested = true;
            throw new Error("Cancelled change must not execute");
        },
    });
    state.bindings.bindDetailsToggleClicks(state.root);
    row.input.checked = false;
    const pending = row.input.fire("change");
    assert.equal(typeof finishConfirmation, "function");
    await row.disclosure.fire("keydown", { key: "Enter" });
    assert.equal(row.open, true);
    assert.equal(row.input.checked, false);
    finishConfirmation("cancel");
    await pending;
    assert.equal(row.input.checked, true);
    assert.equal(row.open, true);
    assert.equal(requested, false);
});

test("controls contract sizes exactly three children intrinsically and lets labels wrap", () => {
    const controls = declarations(".module-row .module-row-controls");
    assert.equal(controls.display, "flex");
    assert.equal(controls["flex-wrap"], "wrap");
    assert.equal(controls.width, "max-content");
    assert.equal(controls["min-width"], "0");
    assert.equal(controls["max-width"], "100%");
    assert.equal(controls["justify-self"], "end");
    const pill = declarations(".module-row-controls > .state-pill");
    assert.equal(pill["min-width"], "0");
    assert.equal(pill["overflow-wrap"], "anywhere");
    assert.equal(pill["white-space"], "normal");
    for (const selector of [
        ".module-row-title",
        ".adapter-inline-name",
        ".module-detail-key",
        ".module-detail-value",
        ".adapter-inline-name > strong",
    ]) {
        const rule = declarations(selector);
        assert.equal(rule["min-width"], "0");
        assert.equal(rule["overflow-wrap"], "anywhere");
    }
});

test("constrained row contract follows its container and keeps disclosure beside controls", () => {
    assert.equal(declarations(".module-row")["container-type"], "inline-size");
    const compact = styles.slice(
        styles.indexOf("@container (max-width: 30rem)"),
    );
    assert.equal(
        declarations(
            ".adapter-inline-row > summary.adapter-inline-summary",
            compact,
        )["grid-template-columns"],
        "minmax(0, 1fr) auto",
    );
    assert.equal(
        declarations(
            ".module-row > summary > .collapsible-section-title",
            compact,
        )["grid-column"],
        "1 / -1",
    );
    const controls = declarations(
        ".module-row > summary > .module-row-controls",
        compact,
    );
    const disclosure = declarations(
        ".module-row > summary > .module-chevron",
        compact,
    );
    assert.equal(controls["grid-column"], "1");
    assert.equal(disclosure["grid-column"], "2");
    assert.equal(controls["grid-row"], disclosure["grid-row"]);
    assert.equal(
        declarations(".module-detail-item", compact)["grid-template-columns"],
        "minmax(0, 1fr)",
    );
});

test("declared control floors leave wrapping space in constrained rows", () => {
    const gap = Number.parseFloat(
        declarations(".module-row .module-row-controls").gap,
    );
    const sliderWidth = Number.parseFloat(declarations(".slider").width);
    const disclosureWidth = Number.parseFloat(
        declarations(".module-row > summary > .module-chevron")["min-width"],
    );
    for (const rowWidth of [180, 220, 280, 320, 480]) {
        const controlsWidth = rowWidth - 32 - disclosureWidth - gap;
        assert.ok(
            controlsWidth >= sliderWidth,
            `${rowWidth}px row retains a full switch when controls wrap`,
        );
        assert.ok(
            controlsWidth >= 44,
            `${rowWidth}px row leaves label padding and a readable character`,
        );
    }
});

test("power CSS preserves native focus, disabled semantics, touch targets and theme styling", () => {
    const input = declarations(".module-row-controls .switch input");
    assert.equal(input.display, "block");
    assert.equal(input.inset, "0");
    assert.equal(input.width, "100%");
    assert.equal(input.height, "100%");
    assert.equal(input.opacity, "0");
    assert.equal(
        declarations(".module-row-controls > .switch--inline")["min-height"],
        "44px",
    );
    assert.equal(
        declarations(".module-row > summary > .module-chevron")["min-height"],
        "44px",
    );
    assert.ok(
        declarations(
            ".module-row-controls .switch input:focus-visible + .slider",
        ).outline.includes("var(--accent"),
    );
    assert.equal(
        declarations(".module-row-controls .switch input:disabled").cursor,
        "not-allowed",
    );
    assert.equal(
        declarations(".switch input:disabled + .slider").opacity,
        "0.45",
    );
    assert.ok(declarations('body[data-theme="light"] .slider').background);
    assert.ok(declarations(".slider").background);
});

for (const omitEnglish of [false, true]) {
    test(`health localization ${omitEnglish ? "rejects missing English" : "falls back to English"}`, async (context) => {
        const globals = [
            "localStorage",
            "window",
            "document",
            "DOMParser",
            "fetch",
        ];
        const previous = new Map(
            globals.map((name) => [
                name,
                Object.getOwnPropertyDescriptor(globalThis, name),
            ]),
        );
        context.after(() => {
            for (const [name, descriptor] of previous) {
                if (descriptor)
                    Object.defineProperty(globalThis, name, descriptor);
                else delete globalThis[name];
            }
        });
        installI18nEnvironment((path) => {
            const locale = path.includes("/de/") ? "de" : "en";
            let xml = readFileSync(
                new URL(
                    `../../languages/${locale}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            );
            if (locale === "de" || omitEnglish) {
                xml = xml.replace(
                    /<string name="ui.reuse.healthy">[^<]*<\/string>/,
                    "",
                );
            }
            return new Response(xml);
        });
        const { createI18n } = await import(
            `../../reuse/i18n.js?administration=${crypto.randomUUID()}`
        );
        const i18n = await createI18n({
            preferredLanguages: ["de"],
            persistLocale: false,
        });
        const render = () =>
            renderComponentsContent(
                [],
                [{ id: "example", name: "Example", status: "active" }],
                [],
                {
                    i18n,
                    escapeHtml,
                    healthStatus: {
                        contributions: [
                            {
                                componentType: "gateway",
                                componentId: "example",
                                status: "ok",
                            },
                        ],
                    },
                },
            );
        if (omitEnglish) {
            assert.throws(render, {
                code: "missing_translation",
                key: "ui.reuse.healthy",
            });
        } else {
            assert.match(render(), /aria-label="Healthy"/);
        }
    });
}

for (const locale of ["de", "en", "id", "ja"]) {
    test(`${locale} disabled rows retain status and independent disclosure controls`, () => {
        const { html, i18n } = localizedRows(locale, { status: "disabled" });
        const { rows } = rowFixture(html);
        assert.equal(rows.length, 2);
        assert.ok(rows.every((row) => !row.input.checked));
        assert.equal(
            html.split(
                `state-pill pill-disabled">${i18n.t("ui.app.admin.state.disabled")}</span>`,
            ).length - 1,
            2,
        );
        assert.equal(html.split("component-health-light-spacer").length - 1, 2);
        assert.equal(html.split("data-details-toggle").length - 1, 2);
        assert.equal(rows[0].input.disabled, false);
        assert.equal(rows[1].input.disabled, true);
    });
}

test("long unbroken status translations preserve text and leave a name track on wide rows", () => {
    const { gateway, adapter, i18n } = localizedRows("de");
    const label = "Komponentenstatus".repeat(12);
    const html = renderComponentsContent([], [gateway], [adapter], {
        escapeHtml,
        i18n: {
            t: (key) =>
                key === "ui.app.admin.state.active" ? label : i18n.t(key),
        },
    });
    assert.equal(html.split(`${label}</span>`).length - 1, 2);
    assert.equal(
        declarations(".adapter-inline-row > summary.adapter-inline-summary")[
            "grid-template-columns"
        ],
        "minmax(10rem, 1fr) minmax(0, max-content) auto",
    );
});
