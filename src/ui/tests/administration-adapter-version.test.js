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

test("administration adapters expose version metadata in details", () => {
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
                publisher: "Cognis & Labs",
                active: true,
            },
        ],
        { i18n, escapeHtml, healthStatus: { contributions: [] } },
    );

    assert.match(
        html,
        /<details class="module-row adapter-inline-row"[^]*<summary class="adapter-inline-summary">/,
    );
    assert.doesNotMatch(html, /adapter-inline-version/);
    assert.match(html, /module-detail-value">0\.2\.6<\/span>/);
    assert.match(html, /module-detail-value">Cognis &amp; Labs<\/span>/);
    assert.doesNotMatch(html, /data-adapter-config/);
    assert.match(html, /module-row-controls adapter-inline-controls/);
    assert.match(
        html,
        /adapter-inline-controls[^]*state-pill[^]*component-health-light--ok[^]*switch switch--inline/,
    );
});

test("active components use health lights and disabled adapters reserve the slot", () => {
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
    assert.match(html, /state-pill pill-disabled/);
    assert.match(html, /component-health-light-spacer/);
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
        /\.component-health-light--ok\s*{[^}]*background-color: #22c55e;/,
    );
    assert.match(
        styles,
        /\.component-health-light--warning\s*{[^}]*background-color: #f59e0b;/,
    );
    assert.match(
        styles,
        /\.component-health-light--error\s*{[^}]*background-color: #ef4444;/,
    );
    assert.match(
        styles,
        /\.module-row-controls\s*{[^}]*grid-template-columns: 100px 10px 52px 32px;[^}]*align-items: center;[^}]*justify-content: flex-end;/,
    );
    assert.match(
        styles,
        /\.switch\.switch--inline\s*{[^}]*align-items: center;[^}]*align-self: center;[^}]*margin-top: 0;/,
    );
    assert.match(styles, /\.adapter-inline-row\s*{[^}]*border-radius: 12px;/);
});

test("component detail arrows use an independent details hitbox", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/ui-state-bindings.js"),
        "utf8",
    );
    assert.match(source, /querySelectorAll\("\[data-details-toggle\]"\)/);
    assert.match(source, /event\.stopPropagation\(\)/);
    assert.match(source, /details\.open = !details\.open/);
    assert.match(source, /adapter:\$\{adapterGatewayId\}:\$\{adapterId\}/);
});

test("configured adapter rows use the component click behavior", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/administration/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /Array\.isArray\(adapter\?\.schema\) && adapter\.schema\.length > 0/,
    );
    assert.match(source, /adapter\.locked \|\| !adapterHasConfig\(adapter\)/);
    assert.match(source, /e\.target\.closest\?\.\("\[data-details-toggle\]"\)/);
    assert.match(source, /row\.querySelector\("\.switch--inline"\)/);
    assert.match(source, /row\.addEventListener\("click", handleOpen\)/);
    assert.match(source, /row\.addEventListener\("keydown"/);
});
