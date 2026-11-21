import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { renderStructuredContent } from "../../reuse/structured-content.js";

async function hostFixture(definition) {
    const context = vm.createContext({});
    const unexpected = () => {
        throw new Error("Unexpected service operation");
    };
    let loads = 0;
    const imports = {
        "../../reuse/api-client.js": { apiFetch: unexpected },
        "./toggle-flows.js": { shouldQueryGatewayAdapters: unexpected },
        "../../reuse/dynamic-contribution-loader.js": {
            loadDynamicContribution: async (descriptor, options) => {
                loads += 1;
                assert.equal(
                    descriptor.scriptUrl,
                    "/synthetic-contribution.js",
                );
                assert.equal(options.exportName, "createAdminSection");
                return definition;
            },
        },
        "../../reuse/structured-content.js": { renderStructuredContent },
    };
    const url = new URL(
        "../../app/administration/api-loaders.js",
        import.meta.url,
    );
    const module = new vm.SourceTextModule(readFileSync(url, "utf8"), {
        context,
        identifier: url.href,
    });
    await module.link((specifier) => {
        assert.ok(Object.hasOwn(imports, specifier), specifier);
        const values = imports[specifier];
        return new vm.SyntheticModule(
            Object.keys(values),
            function () {
                for (const [key, value] of Object.entries(values))
                    this.setExport(key, value);
            },
            { context },
        );
    });
    await module.evaluate();
    return { module, loads: () => loads, unexpected };
}

function domMarkup(markup) {
    return new JSDOM(`<main>${markup}</main>`);
}

test("actual Administration public loader preserves contributor ownership and waits for readiness", async () => {
    let ready;
    const dataReady = new Promise((resolve) => {
        ready = resolve;
    });
    const onRender = () => {};
    const definition = {
        id: "synthetic",
        label: "Synthetic",
        dataReady,
        onRender,
        content: [
            {
                items: [
                    {
                        type: "button",
                        text: "Create",
                        variant: "confirm",
                        id: "synthetic-create",
                    },
                ],
            },
        ],
    };
    const fixture = await hostFixture(definition);
    let settled = false;
    const pending = fixture.module.namespace
        .loadGatewaySection({ scriptUrl: "/synthetic-contribution.js" }, {})
        .then((value) => {
            settled = true;
            return value;
        });
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(settled, false);
    ready();
    const result = await pending;
    assert.equal(fixture.loads(), 1);
    assert.equal(result.subComposerOptions.onRender, onRender);
    assert.equal(result.subComposerOptions.allowCustomization, false);
    assert.equal(result.subComposerOptions.elements[0].pinned, true);
    const dom = domMarkup(result.subComposerOptions.elements[0].render());
    try {
        assert.equal(
            dom.window.document
                .querySelector("#synthetic-create")
                .classList.contains("btn-confirm"),
            true,
        );
    } finally {
        dom.window.close();
    }
});
test("actual Administration structured contribution rendering supplies neutral shared styling", async () => {
    const definition = {
        id: "synthetic",
        label: "Synthetic",
        content: [
            {
                items: [
                    {
                        type: "button",
                        text: "Inspect",
                        id: "synthetic-inspect",
                    },
                ],
            },
        ],
    };
    const fixture = await hostFixture(definition);
    const result = await fixture.module.namespace.loadGatewaySection(
        { scriptUrl: "/synthetic-contribution.js" },
        {},
    );
    const dom = domMarkup(result.subComposerOptions.elements[0].render());
    try {
        assert.equal(
            dom.window.document
                .querySelector("#synthetic-inspect")
                .classList.contains("btn-neutral"),
            true,
        );
    } finally {
        dom.window.close();
    }
});
test("non-structured contribution with custom markup is returned untouched", async () => {
    const definition = {
        id: "synthetic-custom",
        label: "Synthetic",
        renderContent: () =>
            '<a class="custom-link" href="/synthetic-destination">Inspect</a>',
    };
    const fixture = await hostFixture(definition);
    const result = await fixture.module.namespace.loadGatewaySection(
        { scriptUrl: "/synthetic-contribution.js" },
        {},
    );
    assert.equal(result, definition);
    assert.equal(result.renderContent(), definition.renderContent());
});
