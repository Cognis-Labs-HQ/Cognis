import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../reuse/escape-html.js";
import { renderComponentsContent } from "../../../app/administration/render-components.js";

export class Control {
    constructor(attributes = "") {
        this.attributes = Object.fromEntries(
            [...attributes.matchAll(/([\w-]+)="([^"]*)"/g)].map((match) =>
                match.slice(1),
            ),
        );
        this.dataset = Object.fromEntries(
            Object.entries(this.attributes)
                .filter(([name]) => name.startsWith("data-"))
                .map(([name, value]) => [
                    name
                        .slice(5)
                        .replace(/-([a-z])/g, (_, letter) =>
                            letter.toUpperCase(),
                        ),
                    value,
                ]),
        );
        this.checked = /\bchecked\b/.test(attributes);
        this.disabled = /\bdisabled\b/.test(attributes);
        this.handlers = new Map();
    }

    addEventListener(type, handler) {
        const handlers = this.handlers.get(type) ?? [];
        handlers.push(handler);
        this.handlers.set(type, handlers);
    }

    async fire(type, properties = {}) {
        const event = {
            type,
            target: this,
            defaultPrevented: false,
            propagationStopped: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
            stopPropagation() {
                this.propagationStopped = true;
            },
            ...properties,
        };
        for (const handler of this.handlers.get(type) ?? [])
            await handler(event);
        return event;
    }
}

export class Details extends Control {
    open = false;

    setAttribute(name, value) {
        this.attributes[name] = value;
        if (name === "open") this.open = true;
    }
}

export function rowFixture(html) {
    const rows = [
        ...html.matchAll(
            /<details ([^>]+)>\s*<summary[^>]+>([\s\S]*?)<\/summary>/g,
        ),
    ].map((match) => {
        const row = new Details(match[1]);
        row.input = new Control(match[2].match(/<input ([^>]+)>/)[1]);
        row.label = new Control();
        row.disclosure = new Control();
        row.disclosure.closest = () => row;
        return row;
    });
    const root = {
        querySelectorAll(selector) {
            if (selector === "[data-details-toggle]")
                return rows.map((row) => row.disclosure);
            if (selector === ".module-row summary .switch--inline")
                return rows.map((row) => row.label);
            if (selector === "details.module-row") return rows;
            if (selector === "details.module-row[open]")
                return rows.filter((row) => row.open);
            if (selector.includes("[data-module]")) return [];
            if (selector === ".adapter-toggle[data-adapter][data-gateway]") {
                return rows
                    .filter((row) => row.dataset.adapterId)
                    .map((row) => row.input);
            }
            if (
                selector ===
                'input[type="checkbox"][data-gateway]:not(.adapter-toggle)'
            ) {
                return rows
                    .filter((row) => row.dataset.gateway)
                    .map((row) => row.input);
            }
            throw new Error(`Unexpected row query: ${selector}`);
        },
    };
    const storage = new Map();
    const globals = {
        HTMLDetailsElement: Details,
        HTMLInputElement: Control,
        sessionStorage: {
            getItem: (key) => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
        },
    };
    const bindings = loadTestModule(
        new URL(
            "../../../app/administration/ui-state-bindings.js",
            import.meta.url,
        ),
        {},
        globals,
    );
    const runtime = loadTestModule(
        new URL(
            "../../../app/administration/runtime-toggles.js",
            import.meta.url,
        ),
        {},
        globals,
    );
    return { rows, root, bindings, runtime, storage };
}

export function localizedRows(
    locale = "en",
    { status = "active", locked = false, health = "ok" } = {},
) {
    const strings = new Map(
        [
            ...readFileSync(
                new URL(
                    `../../../languages/${locale}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            ).matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
        ].map((match) => match.slice(1)),
    );
    const i18n = {
        t: (key) => {
            if (!strings.has(key))
                throw new Error(`Missing translation: ${key}`);
            return strings.get(key);
        },
    };
    const version =
        "2026.11.14-preview-with-a-very-long-version-label+build.1234567890";
    const gateway = {
        id: "example",
        name: "Gateway with an unusually long localized display name",
        version,
        status,
        hasAdapters: true,
        required: locked,
    };
    const adapter = {
        id: "example-adapter",
        _gatewayId: gateway.id,
        name: "長い名前のアダプターと追加のコンポーネント情報",
        version,
        active: status === "active",
        locked,
        schema: [{ key: "endpoint", type: "text" }],
    };
    const html = renderComponentsContent([], [gateway], [adapter], {
        i18n,
        escapeHtml,
        healthStatus: {
            contributions: [
                {
                    componentType: "gateway",
                    componentId: gateway.id,
                    status: health,
                },
                {
                    componentType: "adapter",
                    componentId: `${gateway.id}:${adapter.id}`,
                    status: health,
                },
            ],
        },
    });
    return { html, gateway, adapter, version, i18n };
}
