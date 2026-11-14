import test from "node:test";
import assert from "node:assert/strict";
import { loadRegistrationIntegrations } from "../ui/register/integrations.js";

for (const stage of ["module", "localization"]) {
    for (const declared of [false, true]) {
        test(`${stage} failure ${declared ? "blocks declared onboarding" : "preserves optional field-plugin independence"}`, async () => {
            const broken = {
                id: "broken",
                scriptUrl: "broken.js",
                stringsBaseUrl: "broken",
            };
            if (declared) broken.onboardingOperations = ["provider:complete"];
            const errors = [];
            const result = await loadRegistrationIntegrations({
                descriptors: [
                    broken,
                    {
                        id: "working",
                        scriptUrl: "working.js",
                        stringsBaseUrl: "working",
                    },
                ],
                loadModule: async (scriptUrl) => {
                    if (stage === "module" && scriptUrl === "broken.js")
                        throw new Error("module_failed");
                    return declared && scriptUrl === "broken.js"
                        ? { completeRegistration() {} }
                        : {};
                },
                loadI18n: async (stringsBaseUrl) => {
                    if (stage === "localization" && stringsBaseUrl === "broken")
                        throw new Error("localization_failed");
                    return {};
                },
                onError: (error, descriptor) =>
                    errors.push([error.message, descriptor.id]),
            });
            assert.equal(result.ready, !declared);
            assert.deepEqual(
                result.integrations.map(
                    (integration) => integration.descriptor.id,
                ),
                ["working"],
            );
            assert.deepEqual(errors, [[`${stage}_failed`, "broken"]]);
        });
    }
}

test("successful declared provider remains ready with its actual module and descriptor", async () => {
    const descriptor = {
        id: "provider",
        scriptUrl: "provider.js",
        onboardingOperations: ["provider:complete"],
    };
    const module = { completeRegistration() {} };
    const result = await loadRegistrationIntegrations({
        descriptors: [descriptor],
        loadModule: async () => module,
        loadI18n: async () => ({}),
        onError: () => assert.fail(),
    });
    assert.equal(result.ready, true);
    assert.deepEqual(result.integrations[0].module, module);
    assert.deepEqual(result.integrations[0].descriptor, descriptor);
    assert.ok(Object.isFrozen(result.integrations[0].descriptor));
});

for (const completion of [undefined, null, false, "callback", {}]) {
    test(`declared onboarding requires callable completion (${String(completion)})`, async () => {
        const errors = [];
        const result = await loadRegistrationIntegrations({
            descriptors: [
                {
                    id: "consent",
                    scriptUrl: "consent.js",
                    onboardingOperations: ["consent:record"],
                },
            ],
            loadModule: async () => ({ completeRegistration: completion }),
            loadI18n: async () => ({}),
            onError: (error) => errors.push(error.message),
        });
        assert.equal(result.ready, false);
        assert.equal(result.integrations.length, 0);
        assert.deepEqual(errors, ["registration_completion_unavailable"]);
    });
}

test("all declarations are captured before the first asynchronous module load", async () => {
    const descriptors = [
        {
            id: "first",
            scriptUrl: "first.js",
            onboardingOperations: ["first:record"],
        },
        {
            id: "second",
            scriptUrl: "second.js",
            onboardingOperations: ["second:record"],
        },
    ];
    const result = await loadRegistrationIntegrations({
        descriptors,
        loadModule: async () => {
            descriptors[1].onboardingOperations.push("foreign:record");
            await Promise.resolve();
            return { completeRegistration() {} };
        },
        loadI18n: async () => ({}),
        onError: () => assert.fail(),
    });
    assert.equal(result.ready, true);
    assert.deepEqual(result.integrations[1].descriptor.onboardingOperations, [
        "second:record",
    ]);
    assert.throws(
        () =>
            result.integrations[1].descriptor.onboardingOperations.push(
                "foreign:record",
            ),
        TypeError,
    );
});

for (const callback of [undefined, null, false, () => {}]) {
    test(`an unmigrated completion export blocks signup (${String(callback)})`, async () => {
        const errors = [];
        const result = await loadRegistrationIntegrations({
            descriptors: [{ id: "unmigrated", scriptUrl: "unmigrated.js" }],
            loadModule: async () => ({ completeRegistration: callback }),
            loadI18n: async () => ({}),
            onError: (error) => errors.push(error.message),
        });
        assert.equal(result.ready, false);
        assert.equal(result.integrations.length, 0);
        assert.deepEqual(errors, ["registration_operations_unavailable"]);
    });
}
