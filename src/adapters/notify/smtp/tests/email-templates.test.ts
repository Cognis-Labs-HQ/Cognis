import assert from "node:assert/strict";
import test from "node:test";
import {
    createCtx,
    runBootstrapScope,
    type BootstrapDisposer,
} from "@cognis/core";
import { createEmailTemplates } from "../email-templates.js";
import { renderEmailLayout } from "../email-layout.js";

async function fixture() {
    const root = createCtx();
    const api = await runBootstrapScope(root, "adapter:notify:smtp", () =>
        createEmailTemplates(root),
    );
    return { root, api };
}

test("module email factories expose options and compose safe themed content", async () => {
    const { root, api } = await fixture();
    const cleanup: BootstrapDisposer[] = [];
    const id = await runBootstrapScope(
        root,
        "module:example",
        () =>
            api.registerFactory({
                id: "report",
                labelKey: "module.example.report",
                stringsBaseUrl: "/static/modules/example/languages",
                options: {
                    heading: {
                        type: "string",
                        labelKey: "module.example.heading",
                        required: true,
                    },
                    compact: {
                        type: "boolean",
                        labelKey: "module.example.compact",
                        default: true,
                    },
                },
                render(message, context) {
                    assert.equal(context.theme, "dark");
                    assert.equal(context.options.compact, true);
                    return api.compose(message, {
                        brandName: "Example",
                        blocks: [
                            api.blocks.heading(String(context.options.heading)),
                            api.blocks.paragraph(message.body),
                            api.blocks.table(
                                ["Value"],
                                [[context.variables.value]],
                            ),
                            api.blocks.action(
                                "Open",
                                "https://example.test/report",
                            ),
                        ],
                    });
                },
            }),
        (dispose) => cleanup.push(dispose),
    );
    assert.equal(id, "module:example:report");
    assert.equal(
        api.listFactories().find((factory) => factory.id === id)?.options
            ?.heading.required,
        true,
    );
    assert.throws(() => api.bindFactory(id), /invalid_email_template_option/);
    assert.throws(
        () => api.bindFactory(id, { heading: "Report", unknown: true }),
        /invalid_email_template_option/,
    );
    const render = api.bindFactory(id, { heading: "Report" });
    const result = await render(
        { subject: "Report", body: "<script>alert(1)</script> {{subject}}" },
        "dark",
        { value: "42" },
    );
    const dark = await renderEmailLayout(result.subject, result.body, {
        theme: "dark",
        presentation: result.presentation,
    });
    assert.match(dark.htmlBody, /#0a1628/);
    assert.match(dark.htmlBody, /&lt;script&gt;/);
    assert.match(dark.htmlBody, /\{\{subject\}\}/);
    assert.match(dark.htmlBody, /<th scope="col"/);
    assert.match(dark.textBody, /42/);
    assert.match(dark.textBody, /Open: https:\/\/example.test\/report/);
    const light = await renderEmailLayout(result.subject, result.body, {
        presentation: result.presentation,
    });
    assert.match(light.htmlBody, /#e8eef9/);
    for (const dispose of [...cleanup].reverse()) await dispose();
    await assert.rejects(
        render({ subject: "Late", body: "Late" }, "dark", {}),
        /factory_unavailable/,
    );
    for (const dispose of cleanup) await dispose.reactivate?.();
    assert.equal(
        (
            await render({ subject: "Restored", body: "" }, "dark", {
                value: "1",
            })
        ).subject,
        "Restored",
    );
    await assert.rejects(
        api.registerFactory({
            id: "late",
            labelKey: "late",
            render: (message) => message,
        }),
        /registration_closed/,
    );
});

test("factories validate safe composition and revoke in-flight removed providers", async () => {
    const { root, api } = await fixture();
    assert.throws(
        () =>
            api.compose(
                { subject: "", body: "" },
                {
                    blocks: [
                        api.blocks.action("Unsafe", "javascript:alert(1)"),
                    ],
                },
            ),
        /invalid_email_url/,
    );
    assert.throws(
        () =>
            api.compose(
                { subject: "", body: "" },
                {
                    blocks: [
                        {
                            type: "table",
                            headings: ["One"],
                            rows: [["Two", "Three"]],
                        },
                    ],
                },
            ),
        /invalid_email_table/,
    );
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
        release = resolve;
    });
    const cleanup: BootstrapDisposer[] = [];
    const id = await runBootstrapScope(
        root,
        "module:slow",
        () =>
            api.registerFactory({
                id: "report",
                labelKey: "module.slow.report",
                async render(message) {
                    await gate;
                    return message;
                },
            }),
        (dispose) => cleanup.push(dispose),
    );
    const pending = api.render(id, { subject: "", body: "" }, {}, "light", {});
    for (const dispose of cleanup) await dispose();
    for (const dispose of cleanup) await dispose.reactivate?.();
    release();
    await assert.rejects(pending, /factory_unavailable/);
});
