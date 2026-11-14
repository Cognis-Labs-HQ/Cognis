import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createAdapterSettingsPopup } from "../../app/administration/reuse/settings-popup.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { installI18nEnvironment } from "../../reuse/tests/fixtures/i18n-environment.js";
import { createI18n, extendI18n } from "../../reuse/i18n.js";

class Element {
    listeners = new Map();
    attributes = new Map();
    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    toggleAttribute(name, present) {
        if (present) this.setAttribute(name, "");
        else this.removeAttribute(name);
    }
    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }
    dispatchEvent(event) {
        this.listeners.get(event.type)?.(event);
    }
    closest() {
        return null;
    }
}

class Input extends Element {}
class Select extends Element {}

function fixture(payload, i18n = { t: (key) => `translated:${key}` }) {
    const fields = new Map();
    const tooltips = [];
    const requests = [];
    const notices = [];
    const form = new Element();
    const content = new Element();
    const overlay = new Element();
    let options;
    let persisted = { limit: 7, ...payload.data };
    form.querySelector = (selector) =>
        selector === ".provider-enable-toggle"
            ? fields.get("enabled")
            : (fields.get(selector.match(/^\[name="(.*)"\]$/)?.[1]) ?? null);
    form.querySelectorAll = () => [...fields.values()];
    overlay.querySelector = (selector) =>
        selector === ".popup-body" ? content : form;
    const { createAdapterConfigPopup } = loadTestModule(
        new URL(
            "../../app/administration/adapter-config-popup.js",
            import.meta.url,
        ),
        {
            "./reuse/settings-popup.js": { createAdapterSettingsPopup },
            "../../reuse/i18n.js": { extendI18n },
            "../../reuse/info-tooltip.js": {
                renderInfoTooltip(text, ariaLabel) {
                    tooltips.push({ text, ariaLabel });
                    return "<span data-test-info-tooltip></span>";
                },
            },
            "../../reuse/popup.js": {
                markPopupFieldInvalid: () =>
                    assert.fail("Unexpected invalid field"),
                resolveFieldErrorId: () => null,
            },
        },
        {
            HTMLElement: Element,
            HTMLInputElement: Input,
            HTMLSelectElement: Select,
            CSS: { escape: String },
            Event,
        },
    );
    const popup = createAdapterConfigPopup({
        i18n,
        escapeHtml,
        apiFetch: async (_url, request) => {
            if (!request?.method || request.method === "GET")
                return Response.json(payload);
            const patch = request.body && JSON.parse(request.body);
            requests.push({ method: request.method, patch });
            persisted =
                request.method === "DELETE"
                    ? { ...payload.envValues }
                    : { ...persisted, ...patch };
            return Response.json({ data: persisted });
        },
        openPopup: async (value) => {
            options = value;
            for (const [, attributes] of value.body.matchAll(
                /<input\s+([^>]+)>/g,
            )) {
                const field = new Input();
                field.name = attributes.match(/\bname="([^"]*)"/)?.[1];
                field.type =
                    attributes.match(/\btype="([^"]*)"/)?.[1] ?? "text";
                field.value = attributes.match(/\bvalue="([^"]*)"/)?.[1] ?? "";
                field.checked = /\bchecked\b/.test(attributes);
                fields.set(field.name, field);
            }
            value.onOpen(overlay, () => {});
        },
        showToast: (text, notice) => notices.push({ text, ...notice }),
    });
    return {
        fields,
        requests,
        notices,
        tooltips,
        open: () =>
            popup.openAdapterConfig("Example", {
                configUrl: "/example/config",
            }),
        body: () => options.body,
        action: (name) => options.onAction(name, overlay),
        persisted: () => persisted,
    };
}

function contract(data = {}, envValues = {}) {
    return {
        data,
        envValues,
        supportsReset: true,
        schema: [
            {
                key: "limit",
                type: "number",
                label: "example.limit",
                infoKey: "example.limit_help",
            },
            { key: "name", type: "text", label: "example.name" },
            { key: "secret", type: "password", label: "example.secret" },
        ],
    };
}

for (const value of ["", "  "]) {
    test(`blank numeric popup values ${JSON.stringify(value)} preserve the boundary-owned default on Save`, async () => {
        const host = fixture(contract());
        await host.open();
        assert.equal(host.fields.get("limit").value, "");
        host.fields.get("limit").value = value;
        host.fields.get("name").value = "Changed";
        assert.equal(await host.action("save"), true);
        assert.deepEqual(host.requests[0], {
            method: "PUT",
            patch: { enabled: false, name: "Changed" },
        });
        assert.equal(host.persisted().limit, 7);
        assert.equal(host.notices.at(-1).variant, "success");
    });
}

test("numeric values remain explicit numbers and clearing an existing value omits the patch field", async () => {
    const host = fixture(contract({ limit: 9 }));
    await host.open();
    assert.equal(host.fields.get("limit").value, "9");
    host.fields.get("limit").value = "12";
    await host.action("save");
    assert.equal(host.requests[0].patch.limit, 12);
    host.fields.get("limit").value = "";
    await host.action("save");
    assert.equal(host.persisted().limit, 12);
    host.fields.get("limit").value = "0";
    await host.action("save");
    assert.equal(host.requests.at(-1).patch.limit, 0);
});

test("reset previews the supplied environment default and saves through the reset contract", async () => {
    const host = fixture(contract({ limit: 12 }, { limit: 8 }));
    await host.open();
    assert.equal(await host.action("reset"), false);
    assert.equal(host.fields.get("limit").value, "8");
    assert.deepEqual(host.requests, []);
    assert.equal(await host.action("save"), true);
    assert.deepEqual(host.requests, [{ method: "DELETE", patch: undefined }]);
    assert.equal(host.persisted().limit, 8);
});

test("generic schema metadata renders localized help at the field label only when contributed", async () => {
    const host = fixture(contract());
    await host.open();
    assert.deepEqual(host.tooltips, [
        {
            text: "translated:example.limit_help",
            ariaLabel: "translated:ui.reuse.more_information",
        },
    ]);
    assert.match(
        host.body(),
        /provider-field-title"><label for="limit">translated:example.limit<\/label><span data-test-info-tooltip>/,
    );
    const withoutHelp = contract();
    delete withoutHelp.schema[0].infoKey;
    const unannotated = fixture(withoutHelp);
    await unannotated.open();
    assert.deepEqual(unannotated.tooltips, []);
});

for (const englishHelp of [true, false]) {
    test(`provider help honors preferred-language fallback with English availability ${englishHelp}`, async (context) => {
        const previous = new Map(
            ["localStorage", "window", "document", "DOMParser", "fetch"].map(
                (name) => [
                    name,
                    Object.getOwnPropertyDescriptor(globalThis, name),
                ],
            ),
        );
        context.after(() => {
            for (const [name, descriptor] of previous) {
                if (descriptor)
                    Object.defineProperty(globalThis, name, descriptor);
                else delete globalThis[name];
            }
        });
        installI18nEnvironment(async (path) => {
            if (path.startsWith("/static/languages/")) {
                return new Response(
                    await readFile(
                        new URL(
                            `../../languages/${path.split("/")[3]}/strings.xml`,
                            import.meta.url,
                        ),
                        "utf8",
                    ),
                );
            }
            const help =
                path.includes("/en/") && englishHelp
                    ? "Controls the provider limit."
                    : " ";
            return new Response(
                `<resources><string name="example.limit">Limit</string><string name="example.name">Name</string><string name="example.secret">Secret</string><string name="example.limit_help">${help}</string></resources>`,
            );
        });
        const i18n = await createI18n({
            preferredLanguages: ["de"],
            persistLocale: false,
        });
        const payload = {
            ...contract(),
            stringsBaseUrl: `/provider-help/${englishHelp}`,
        };
        const host = fixture(payload, i18n);
        if (englishHelp) {
            await host.open();
            assert.equal(host.tooltips[0].text, "Controls the provider limit.");
            assert.equal(
                host.tooltips[0].ariaLabel,
                i18n.t("ui.reuse.more_information"),
            );
        } else {
            await assert.rejects(host.open(), {
                code: "missing_translation",
                key: "example.limit_help",
            });
            assert.deepEqual(host.tooltips, []);
        }
    });
}

test("test-field schema contributes the same neutral localized tooltip metadata", async () => {
    const payload = contract();
    payload.supportsTest = true;
    payload.testSchema = [
        {
            key: "destination",
            type: "email",
            label: "example.destination",
            infoKey: "example.destination_help",
        },
    ];
    const host = fixture(payload);
    await host.open();
    assert.equal(host.tooltips[1].text, "translated:example.destination_help");
    assert.match(
        host.body(),
        /<label for="destination">translated:example.destination<\/label><span data-test-info-tooltip>/,
    );
});
