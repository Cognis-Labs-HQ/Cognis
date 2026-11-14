import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
    applyModuleFilterSelection,
    createModuleFilters,
    filterModules,
    renderModuleFilters,
} from "../../app/modules/filters.js";

const marketplaceStyles = readFileSync(
    new URL("../../styles/modules.css", import.meta.url),
    "utf8",
);

test("module filters include modules matching any active category", () => {
    const filters = createModuleFilters();
    assert.equal(
        applyModuleFilterSelection(filters, { storeCategory: "productivity" }),
        true,
    );
    const modules = [
        {
            id: "notes",
            tags: ["productivity", "collaboration"],
        },
        { id: "tasks", tags: ["productivity"] },
        { id: "meetings", tags: ["collaboration"] },
    ];

    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks"],
    );
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks", "meetings"],
    );
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    assert.deepEqual(
        filterModules(modules, filters).map((module) => module.id),
        ["notes", "tasks"],
    );
});

test("module filters expose every selected state", () => {
    const filters = createModuleFilters();
    applyModuleFilterSelection(filters, { storeView: "installed" });
    applyModuleFilterSelection(filters, { storeCategory: "productivity" });
    applyModuleFilterSelection(filters, { storeCategory: "collaboration" });
    const html = renderModuleFilters(
        ["productivity", "collaboration"],
        filters,
        {
            i18n: { t: (key) => key },
            escapeHtml: (value) => value,
            formatTag: (value) => value,
        },
    );

    assert.match(html, /data-store-view="installed" aria-pressed="true"/);
    assert.match(
        html,
        /data-store-category="productivity" aria-pressed="true"/,
    );
    assert.match(
        html,
        /data-store-category="collaboration" aria-pressed="true"/,
    );
    assert.match(
        marketplaceStyles,
        /\[data-module-sidebar\] button\.is-active\s*{[^}]*border-color: var\(--accent-color\)/,
    );
    assert.match(
        marketplaceStyles,
        /\[data-module-sidebar\] button:not\(\.is-active\)\s*{[^}]*border-color: transparent/,
    );
});

test("module marketplace defaults to all statuses", () => {
    const filters = createModuleFilters();
    assert.equal(filters.view, "all");
    assert.equal(filters.categories.size, 0);
});
