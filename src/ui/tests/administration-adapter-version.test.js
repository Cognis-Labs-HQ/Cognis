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
        {
            i18n,
            escapeHtml,
            healthStatus: {
                contributions: [
                    {
                        componentType: "adapter",
                        componentId: "notify:smtp",
                        status: "ok",
                    },
                ],
            },
        },
    );

    assert.match(
        html,
        /<span class="adapter-inline-name"><strong>SMTP <span class="adapter-inline-version">v0\.2\.6<\/span><\/strong><\/span>/,
    );
    assert.match(html, /module-row-controls adapter-inline-controls/);
    assert.match(
        html,
        /adapter-inline-controls[^]*state-pill[^]*component-health-light--ok[^]*switch switch--inline/,
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
    assert.match(
        html,
        /module-row-title[^]*module-row-controls[^]*state-pill[^]*component-health-light--ok[^]*switch switch--inline[^]*module-chevron/,
    );
    assert.doesNotMatch(html, /component-health-light--error/);
    assert.doesNotMatch(html, />unknown</);
});

test("health lights have a rendered box and explicit status colors", () => {
    const styles = readFileSync(
        resolve(ROOT, "src/ui/styles/page-builder/admin.css"),
        "utf8",
    );
    assert.match(
        styles,
        /\.component-health-light\s*{[^}]*display: inline-block;[^}]*flex: 0 0 10px;/,
    );
    assert.match(
        styles,
        /\.component-health-light--ok\s*{[^}]*background: currentColor;/,
    );
    assert.match(
        styles,
        /\.component-health-light--warning\s*{[^}]*background: currentColor;/,
    );
    assert.match(
        styles,
        /\.component-health-light--error\s*{[^}]*background: currentColor;/,
    );
    assert.match(
        styles,
        /\.module-row-controls\s*{[^}]*align-items: center;[^}]*justify-content: flex-end;/,
    );
    assert.match(
        styles,
        /\.switch--inline\s*{[^}]*align-items: center;[^}]*align-self: center;/,
    );
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
