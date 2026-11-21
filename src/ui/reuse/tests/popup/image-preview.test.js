import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

async function imageFixture(context, failLabel) {
    const labels = {
        "ui.reuse.close": "Close",
        "ui.reuse.done": "Done",
        "ui.reuse.image_preview": "Image Preview",
    };
    const fixture = await popupFixture(context, undefined, new Map(), {
        createI18n: async () => ({
            t: (key) => {
                if (failLabel && key === "ui.reuse.image_preview")
                    throw new Error(
                        "missing_translation:ui.reuse.image_preview",
                    );
                assert.ok(labels[key], `Unexpected translation ${key}`);
                return labels[key];
            },
        }),
        boundaries: new Map([
            [
                "toast.js",
                {
                    showToast: () => {
                        throw new Error(
                            "Unexpected toast in direct public image action",
                        );
                    },
                },
            ],
        ]),
    });
    const stylesheet = fixture.document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "/static/styles/reuse/image-preview.css";
    Object.defineProperty(stylesheet, "sheet", { value: {} });
    fixture.document.head.append(stylesheet);
    const controller = new fixture.window.AbortController();
    const flows = new Map();
    const executed = [];
    Object.assign(fixture.ctx, {
        signal: controller.signal,
        registerFlow(identifier, stages) {
            assert.equal(flows.has(identifier), false);
            flows.set(identifier, { stages, hooks: new Map() });
        },
        extendFlow(identifier, stage, metadata, execute) {
            const flow = flows.get(identifier);
            assert.ok(flow?.stages.includes(stage));
            const hooks = flow.hooks.get(stage) ?? [];
            hooks.push({ metadata, execute });
            flow.hooks.set(stage, hooks);
        },
        async runFlow(identifier, input) {
            const flow = flows.get(identifier);
            assert.ok(flow, `Unregistered flow ${identifier}`);
            const stageContext = { input, data: {} };
            for (const stage of flow.stages) {
                executed.push({ identifier, stage });
                for (const hook of flow.hooks.get(stage) ?? [])
                    await hook.execute(stageContext);
            }
            return stageContext;
        },
    });
    const provider = await fixture.importModule("image-preview.js");
    await provider.mountProvider(fixture.ctx);
    assert.ok(flows.has("ui:imagePreview:open"));
    const capability = fixture.capabilities.get("ui:imagePreview");
    assert.equal(typeof capability.open, "function");
    return { ...fixture, controller, capability, executed };
}

test("actual Image Preview owner cannot leave a failed initialization capturing the page", async (context) => {
    const fixture = await imageFixture(context, true);
    await assert.rejects(
        fixture.capability.open({
            src: "https://fixture.invalid/synthetic-image.svg",
            alt: "Synthetic preview",
        }),
        /missing_translation:ui.reuse.image_preview/,
    );
    assert.deepEqual(
        fixture.executed.map(({ stage }) => stage),
        ["before", "execute"],
    );
    fixture.controller.abort();
    await fixture.settle();
    assert.equal(
        fixture.active().length,
        0,
        "failed opening must release the shared modal even after the owner removes its abort listener",
    );
    assert.equal(fixture.document.body.style.overflow, "");
});

test("control: actual Image Preview owner opens and aborts normally through registered stages", async (context) => {
    const fixture = await imageFixture(context, false);
    const result = fixture.capability.open({
        src: "https://fixture.invalid/synthetic-image.svg",
        alt: "Synthetic preview",
    });
    const rejected = assert.rejects(result, { name: "AbortError" });
    await fixture.settle();
    const overlay = fixture.active()[0];
    assert.equal(overlay.getAttribute("aria-label"), "Image Preview");
    assert.equal(overlay.querySelector("img").alt, "Synthetic preview");
    fixture.controller.abort();
    await rejected;
    overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.document.body.style.overflow, "");
    assert.deepEqual(
        fixture.executed.map(({ stage }) => stage),
        ["before", "execute"],
    );
});
