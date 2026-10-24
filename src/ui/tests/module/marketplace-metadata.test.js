import test from "node:test";
import assert from "node:assert/strict";
import {
    resolveLocalizedReadme,
    localizeModulePresentation,
} from "../../app/modules/presentation.js";

test("module details select localized readmes with English fallback", () => {
    const module = {
        readmes: {
            en: "# English",
            ja: "# 日本語",
            default: "# Default",
        },
        readme: "# Catalog fallback",
    };
    assert.equal(resolveLocalizedReadme(module, "ja-JP"), "# 日本語");
    assert.equal(resolveLocalizedReadme(module, "de-DE"), "# English");
    assert.equal(
        resolveLocalizedReadme({ readme: "# Catalog fallback" }, "de"),
        "# Catalog fallback",
    );
});

test("cached marketplace names retain their matching locale bundle after an installed namespace changes", async () => {
    const module = {
        id: "terms-of-service",
        ui: { stringsBaseUrl: "/static/modules/terms-of-service/languages" },
        name: "module.terms-of-service.name",
        catalogPresentation: {
            name: "module.catalog.name",
            summary: "module.catalog.summary",
            description: "module.catalog.description",
            categories: ["module.catalog.category"],
            tags: ["module.catalog.tag"],
            ui: { stringsBaseUrl: "/api/v1/modules/catalog/strings/terms" },
        },
    };
    await localizeModulePresentation(
        module,
        { t: (key) => key },
        async (_base, url) => {
            assert.equal(url, "/api/v1/modules/catalog/strings/terms");
            return {
                t: (key) =>
                    ({
                        "module.catalog.name": "Terms of Service",
                        "module.catalog.summary": "Summary",
                        "module.catalog.description": "Description",
                        "module.catalog.category": "Legal",
                        "module.catalog.tag": "Administration",
                    })[key] ?? key,
            };
        },
    );
    assert.deepEqual(module.localizedPresentation, {
        name: "Terms of Service",
        summary: "Summary",
        description: "Description",
        categories: ["Legal"],
        tags: ["Administration"],
    });
    assert.equal(
        module.ui.stringsBaseUrl,
        "/static/modules/terms-of-service/languages",
    );
});
