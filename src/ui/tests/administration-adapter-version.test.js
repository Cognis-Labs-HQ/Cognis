import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { renderComponentsContent } from "../app/administration/render-components.js";

const ROOT = resolve(fileURLToPath(new URL("../../..", import.meta.url)));

const i18n = { t: (key) => key };
const escapeHtml = (value) =>
    String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");

test("administration adapter rows show adapter version next to the name", () => {
    const html = renderComponentsContent(
        [],
        [
            {
                id: "notify",
                name: "Notifications",
                version: "1.0.0",
                status: "active",
                hasAdapters: true,
                requires: [],
            },
        ],
        [
            {
                _gatewayId: "notify",
                id: "smtp",
                name: "SMTP",
                version: "0.2.6",
                active: true,
            },
        ],
        { i18n, escapeHtml, healthStatus: null },
    );

    assert.match(
        html,
        /<span class="adapter-inline-name"><strong>SMTP <span class="adapter-inline-version">v0\.2\.6<\/span><\/strong><\/span>/,
    );
});

test("active component health uses lights and disabled adapters omit status", () => {
    const i18n = { t: (key) => key };
    const html = renderComponentsContent(
        [{ id: "active-module", name: "Active module", status: "enabled" }],
        [{ id: "notify", name: "Notify", status: "active", hasAdapters: true }],
        [
            {
                id: "disabled-adapter",
                name: "Disabled adapter",
                active: false,
                _gatewayId: "notify",
            },
        ],
        {
            i18n,
            escapeHtml,
            healthStatus: {
                contributions: [
                    {
                        componentType: "module",
                        componentId: "active-module",
                        status: "ok",
                    },
                    {
                        componentType: "adapter",
                        componentId: "notify:disabled-adapter",
                        status: "error",
                    },
                ],
            },
            isModuleEnabled: (record) => record.status === "enabled",
            resolveModuleConfigScriptUrl: () => "",
        },
    );
    assert.match(html, /component-health-light--ok/);
    assert.doesNotMatch(html, /component-health-light--error/);
    assert.doesNotMatch(html, />unknown</);
});

test("component detail arrows use an independent details hitbox", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/ui-state-bindings.js"),
        "utf8",
    );
    assert.match(source, /querySelectorAll\("\[data-details-toggle\]"\)/);
    assert.match(source, /event\.stopPropagation\(\)/);
    assert.match(source, /details\.open = !details\.open/);
});
