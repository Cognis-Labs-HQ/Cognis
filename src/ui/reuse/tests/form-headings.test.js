import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createFormBuilder } from "../form-builder.js";
import { escapeHtml } from "../escape-html.js";
import { createFieldDom } from "./fixtures/form-fields.js";

const fields = [
    { name: "password", type: "password", label: "Password Protection" },
    {
        name: "notes",
        type: "textarea",
        label: "非常に長い見出し".repeat(30),
        maxCharacters: 5,
    },
    {
        name: "audience",
        type: "select",
        label: "Datenschutzeinstellungen".repeat(20),
        options: [{ value: "all", label: "All" }],
    },
    {
        name: "enabled",
        type: "checkbox",
        slider: true,
        labelHtml: 'Accept <a href="/terms">terms</a>',
    },
    {
        name: "visibility",
        type: "radio",
        label: "Pilihan izin akses",
        options: [
            { value: "private", label: "Private" },
            { value: "public", label: "Public" },
        ],
    },
];

function createBuilder(config = fields) {
    return createFormBuilder(
        { i18n: { t: (key) => key }, escapeHtml },
        {
            formId: "headings",
            includeSubmitButton: false,
            fields: config,
        },
    );
}

test("rendered headings keep rich/localized text and markers in one grid item", () => {
    for (const field of fields) {
        for (const required of [false, true]) {
            const markup = createBuilder([{ ...field, required }]).render();
            const heading = markup.match(
                /<span class="form-builder-label-heading">(.*?)<\/span>(?:<\/label>|<\/span>)/s,
            )?.[1];
            assert.ok(heading, field.name);
            const label = field.labelHtml ?? escapeHtml(field.label);
            assert.ok(
                heading.startsWith(
                    `<span class="form-builder-label-content">${label}`,
                ),
            );
            assert.equal(
                heading.includes("data-form-builder-required"),
                required,
            );
            if (required) assert.match(heading, /aria-hidden="true">&#160;\*/);
            if (field.type !== "radio")
                assert.match(
                    markup,
                    new RegExp(
                        `<label for="form-builder-${field.name}"><span class="form-builder-label-heading">`,
                    ),
                );
        }
    }
});

test("required updates share the heading across input types and repeated mounts", () => {
    for (let mount = 0; mount < 3; mount++) {
        const config = structuredClone(fields);
        const builder = createBuilder(config);
        const dom = createFieldDom(config);
        const original = new Map(
            Object.keys(dom.globals).map((name) => [
                name,
                Object.getOwnPropertyDescriptor(globalThis, name),
            ]),
        );
        Object.assign(globalThis, dom.globals);
        const owner = new AbortController();
        try {
            const controller = builder.attach(dom.form, {
                signal: owner.signal,
            });
            assert.equal(controller.setFieldRequired("missing", true), false);
            for (const field of config) {
                const input = dom.inputs.get(field.name);
                const controls = Array.isArray(input) ? input : [input];
                const initialValid = controller.setFieldRequired(
                    field.name,
                    true,
                );
                if (field.type === "radio") assert.equal(initialValid, false);
                controller.setFieldRequired(field.name, true);
                assert.ok(
                    controls.every((control) =>
                        control.hasAttribute("required"),
                    ),
                );
                const heading = dom.headings.get(field.name);
                assert.equal(heading.flags.length, 1);
                assert.equal(heading.flags[0].textContent, "\u00a0*");
                assert.equal(
                    heading.flags[0].getAttribute("aria-hidden"),
                    "true",
                );
                const chosen =
                    field.type === "radio" ? controls[1] : controls[0];
                chosen.focus();
                chosen.value = "abc";
                if (field.type === "radio") chosen.checked = true;
                chosen.dispatchEvent(new Event("input"));
                assert.equal(controller.validateField(field.name, true), true);
                assert.ok(
                    controls.every(
                        (control) =>
                            !control.classList.contains(
                                "form-builder-input--invalid",
                            ),
                    ),
                );
                controller.setFieldRequired(field.name, false);
                assert.equal(heading.flags.length, 0);
                assert.ok(
                    controls.every(
                        (control) => !control.hasAttribute("required"),
                    ),
                );
                assert.equal(chosen.focused, true);
                assert.equal(chosen.value, "abc");
                assert.equal(
                    controller.getValues()[field.name],
                    field.type === "checkbox" ? "false" : "abc",
                );
            }
            const notes = dom.inputs.get("notes");
            notes.value = "abcdef";
            notes.dispatchEvent(new Event("input"));
            assert.equal(notes.value, "abcde");
            assert.equal(dom.counters.get("notes").textContent, "5 / 5");
            controller.setFieldRequired("password", true);
            dom.inputs.get("password").value = "";
            assert.equal(controller.validateField("password", true), false);
            assert.equal(
                dom.wrappers
                    .get("password")
                    .classList.contains("form-builder-field--required-empty"),
                true,
            );
            controller.detach();
        } finally {
            owner.abort();
            for (const [name, descriptor] of original) {
                if (descriptor)
                    Object.defineProperty(globalThis, name, descriptor);
                else delete globalThis[name];
            }
        }
    }
});

test("shared heading CSS owns shrinkability and an inline nonbreaking marker", () => {
    const css = readFileSync(
        new URL("../../styles/reuse/page-sections.css", import.meta.url),
        "utf8",
    );
    assert.match(
        css,
        /\.form-builder-label-text > label,\s*\.form-builder-label-heading\s*\{[^}]*min-width: 0;/,
    );
    assert.match(
        css,
        /\.form-builder-label-heading\s*\{[^}]*display: block;[^}]*white-space: nowrap;/,
    );
    assert.match(
        css,
        /\.form-builder-label-content\s*\{[^}]*white-space: normal;[^}]*overflow-wrap: anywhere;/,
    );
    assert.match(
        css,
        /\.form-builder-required-flag\s*\{[^}]*white-space: nowrap;/,
    );
});
