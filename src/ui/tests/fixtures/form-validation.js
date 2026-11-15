import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";
import { createFormBuilder } from "../../reuse/form-builder.js";
import { escapeHtml } from "../../reuse/escape-html.js";

const sourceRoot = new URL("../../../", import.meta.url);

export async function formValidationFixture(context, locale = "en") {
    const window = new JSDOM("<!doctype html><head></head><body></body>", {
        url: "https://form.example/",
    }).window;
    const globals = new Map();
    function install(name, value) {
        globals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, { configurable: true, value });
    }
    for (const name of [
        "window",
        "document",
        "localStorage",
        "DOMParser",
        "HTMLElement",
        "HTMLInputElement",
        "HTMLFormElement",
        "HTMLSelectElement",
        "HTMLTextAreaElement",
        "RadioNodeList",
    ])
        install(name, name === "window" ? window : window[name]);
    install("CSS", {
        escape(value) {
            assert.match(value, /^[a-z]+$/);
            return value;
        },
    });
    const errors = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    install("fetch", async (path) => {
        const match = String(path).match(
            /^\/(static\/languages|fixtures\/form-validation\/(registration|auth)\/languages)\/([a-z]+)\/strings.xml$/,
        );
        assert.ok(match, `Unexpected catalog request: ${path}`);
        if (!["en", "de", "id", "ja"].includes(match[3]))
            return new Response("", { status: 404 });
        const base = match[2] ? `gateways/${match[2]}/ui` : "ui";
        return new Response(
            readFileSync(
                new URL(
                    `${base}/languages/${match[3]}/strings.xml`,
                    sourceRoot,
                ),
            ),
        );
    });
    const hooks = registerHooks({
        resolve(specifier, parent, nextResolve) {
            if (specifier.startsWith("/static/gateways/auth/"))
                return nextResolve(
                    new URL(
                        `gateways/auth/ui/${specifier.slice(22)}`,
                        sourceRoot,
                    ).href,
                    parent,
                );
            if (specifier.startsWith("/static/reuse/"))
                return nextResolve(
                    new URL(`ui/reuse/${specifier.slice(14)}`, sourceRoot).href,
                    parent,
                );
            return nextResolve(specifier, parent);
        },
    });
    context.after(() => {
        hooks.deregister();
        window.close();
        for (const [name, descriptor] of globals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
        assert.deepEqual(errors, [], "Form event handlers must not throw");
    });
    const { createI18n } = await import("../../reuse/i18n.js");
    const i18n = await createI18n({
        preferredLanguages: [locale],
        persistLocale: false,
        componentStringBaseUrls: [
            "/fixtures/form-validation/registration/languages",
            "/fixtures/form-validation/auth/languages",
        ],
    });
    function mount(fields, options = {}, attachOptions) {
        const builder = createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "validation-form",
                fields,
                ...options,
            },
        );
        const host = window.document.createElement("section");
        host.innerHTML = builder.render();
        window.document.body.append(host);
        const form = host.querySelector("form");
        const controller = builder.attach(form, attachOptions);
        context.after(() => controller.detach());
        return { builder, form, controller };
    }
    function input(form, name, value, event = "input") {
        const control = form.elements.namedItem(name);
        control.value = value;
        control.dispatchEvent(new window.Event(event, { bubbles: true }));
        return control;
    }
    return { window, document: window.document, i18n, mount, input };
}

export function lowercaseField(options = {}) {
    return {
        name: "username",
        labelKey: "ui.app.register.username",
        criteria: [
            {
                id: "lowercase",
                type: "custom",
                test: (value) => /^[a-z]+$/.test(value),
                messageKey: "ui.app.register.error.username_not_lowercase",
            },
        ],
        ...options,
    };
}

export function descriptions(input) {
    return (input.getAttribute("aria-describedby") ?? "")
        .split(/\s+/)
        .filter(Boolean);
}
