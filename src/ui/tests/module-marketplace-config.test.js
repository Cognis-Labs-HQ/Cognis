import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
    assertRequiredModulePreferences,
    missingRequiredModulePreferenceKeys,
    readModulePreferenceValues,
} from "../app/modules/preferences.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const marketplaceStyles = readFileSync(
    resolve(ROOT, "src/ui/styles/modules.css"),
    "utf8",
);
const modulePreferencesSource = readFileSync(
    resolve(ROOT, "src/ui/app/modules/preferences.js"),
    "utf8",
);

test("required module configuration distinguishes unset values from valid false values", () => {
    const definitions = [
        { key: "instanceUrl", type: "string", required: true },
        { key: "meetingPrefix", type: "string" },
        { key: "recording", type: "boolean", required: true },
        { key: "capacity", type: "number", required: true },
        { key: "apiKey", type: "password", required: true },
    ];
    assert.deepEqual(
        missingRequiredModulePreferenceKeys(definitions, {
            instanceUrl: " ",
            recording: false,
            capacity: Number.NaN,
            apiKeyConfigured: true,
        }),
        ["instanceUrl", "capacity"],
    );
    assert.deepEqual(
        missingRequiredModulePreferenceKeys(definitions, {
            instanceUrl: "https://meet.example.com",
            recording: false,
            capacity: 0,
            apiKeyConfigured: true,
        }),
        [],
    );
    assert.match(modulePreferencesSource, /definition\.required === true/);
    assert.match(modulePreferencesSource, /return "\*\*\*\*"/);
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /action === "enable"[\s\S]*activateModule/);
    const activationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/activation.js"),
        "utf8",
    );
    assert.match(
        activationSource,
        /enableModuleWithIntegrityCheck\(module\.id, i18n\);[\s\S]*if \(!result\) return null;[\s\S]*openModulePreferences/,
    );
    const inputs = {
        apiKey: { value: "secret-value" },
        enabled: { checked: false },
        limit: { value: "12" },
    };
    assert.deepEqual(
        readModulePreferenceValues(
            {
                elements: {
                    namedItem(key) {
                        return inputs[key];
                    },
                },
            },
            [
                { key: "apiKey", type: "password" },
                { key: "enabled", type: "boolean" },
                { key: "limit", type: "number" },
            ],
        ),
        { apiKey: "secret-value", enabled: false, limit: 12 },
    );
    inputs.apiKey.value = "****";
    assert.deepEqual(
        readModulePreferenceValues(
            {
                elements: {
                    namedItem(key) {
                        return inputs[key];
                    },
                },
            },
            [{ key: "apiKey", type: "password" }],
        ),
        { apiKey: "" },
    );
    assert.match(
        marketplaceStyles,
        /\.module-store-card-actions \.button-loading[\s\S]*white-space: nowrap/,
    );
});

test("disabled modules defer required config checks when their owned route is not mounted", async () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const module = {
        id: "example-module",
        ui: {
            preferences: [
                { key: "instanceUrl", type: "string", required: true },
            ],
        },
    };
    assert.equal(
        await assertRequiredModulePreferences(
            module,
            "Configuration required",
            () =>
                Promise.reject(
                    Object.assign(new Error("Route not found"), {
                        status: 404,
                    }),
                ),
        ),
        false,
    );
    await assert.rejects(
        () =>
            assertRequiredModulePreferences(
                module,
                "Configuration required",
                () => Promise.resolve({ instanceUrl: "" }),
            ),
        (error) => error.code === "module_config_required",
    );
    const activationSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/activation.js"),
        "utf8",
    );
    assert.match(
        activationSource,
        /configRouteAvailable = module\.status === "enabled"[\s\S]*openModulePreferences[\s\S]*setModuleEnabled\(module\.id, false\)/,
    );
    assert.match(modulePreferencesSource, /readModulePreferenceValues/);
    assert.match(
        marketplaceSource,
        /if \(wasDisabled\)[\s\S]*enableModuleWithIntegrityCheck[\s\S]*openModulePreferences[\s\S]*wasDisabled && !didSave/,
    );
});

test("module enablement presents and acknowledges SHASUM integrity risks", () => {
    const marketplaceSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/index.js"),
        "utf8",
    );
    const integritySource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/integrity.js"),
        "utf8",
    );
    const apiSource = readFileSync(
        resolve(ROOT, "src/ui/app/modules/api.js"),
        "utf8",
    );
    assert.match(marketplaceSource, /action === "enable"[\s\S]*activateModule/);
    assert.match(integritySource, /entry\.status === "missing_shasum"/);
    assert.match(integritySource, /entry\.status === "missing"/);
    assert.match(integritySource, /labels\.mismatch/);
    assert.match(integritySource, /variant: "cancel"/);
    assert.match(
        integritySource,
        /await setModuleEnabled\(moduleId, true\);[\s\S]*return true/,
    );
    assert.match(
        apiSource,
        /"x-cognis-module-integrity-risk":\s*`accepted:\$\{integrityAcknowledgementToken\}`/,
    );
});
