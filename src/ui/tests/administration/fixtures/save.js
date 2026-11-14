import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
    importTestModule,
    loadTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import { createAdministrationSave } from "../../../app/administration/save.js";
import * as duration from "../../../reuse/duration-input.js";
import { createAdministrationReloaders } from "../../../app/administration/reloaders.js";

export const settings = {
    trustedDomains: ["trusted.example"],
    userValidationMode: "smtp",
    requireTeacherManualApproval: false,
    enforceTfaForAllUsers: true,
    loginSessionTimeoutMinutes: 30,
};
export const policy = {
    minLength: 20,
    requireUppercase: 2,
    requireLowercase: 2,
    requireDigit: 2,
    requireSpecial: 2,
};

class Control {
    value = "";
    checked = false;
    handlers = new Map();
    addEventListener(type, handler, options) {
        const handlers = this.handlers.get(type) ?? [];
        handlers.push({ handler, signal: options?.signal });
        this.handlers.set(type, handlers);
    }
    async fire(type) {
        for (const { handler, signal } of this.handlers.get(type) ?? []) {
            if (!signal?.aborted) await handler();
        }
    }
}
class Input extends Control {}
class Select extends Control {}

export function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

export async function environment({ createContribution } = {}) {
    const lifetime = new AbortController();
    let visible = false;
    let config;
    let section;
    let contributionOptions;
    let contributionDirty = false;
    let contributionFails = false;
    let requestHandler;
    let navigationDecision = "stay";
    const requests = [];
    const events = [];
    const fields = new Map();
    const save = new Control();
    const discard = new Control();
    const slot = {
        querySelector: (selector) =>
            selector.includes("save") ? save : discard,
        hidden: true,
    };
    const root = {
        querySelector: (selector) =>
            visible ? (fields.get(selector) ?? null) : null,
        querySelectorAll: () =>
            visible
                ? [...fields.values()].filter(
                      (field) => field instanceof Control,
                  )
                : [],
    };
    function mountFields() {
        fields.clear();
        for (const name of [
            "trusted-domains",
            "require-teacher-approval",
            "enforce-tfa-for-all-users",
            "login-session-timeout",
            "policy-min-length",
            "policy-require-uppercase",
            "policy-require-lowercase",
            "policy-require-digit",
            "policy-require-special",
        ]) {
            fields.set(`#security-${name}`, new Input());
        }
        fields.set("#security-user-validation-mode", new Select());
        fields.set("#security-login-session-timeout-unit", new Select());
        fields.set("#security-login-session-timeout-warning", {
            toggleAttribute() {},
        });
    }
    const apiFetch = async (url, options = {}) => {
        const request = {
            url,
            method: options.method ?? "GET",
            body: options.body && JSON.parse(options.body),
        };
        requests.push(request);
        const result = await requestHandler?.(request);
        return (
            result ?? {
                ok: true,
                json: async () => ({
                    data: structuredClone(
                        url.includes("password-policy") ? policy : settings,
                    ),
                }),
            }
        );
    };
    const i18n = { t: (key) => key };
    const i18nModule = {
        createI18n: async () => i18n,
        extendI18n: async (value) => value,
        applyDocumentTitle() {},
    };
    const uiCtx = {
        capabilities: {
            get: (name) =>
                name === "ui:log"
                    ? (...args) => events.push({ kind: "log", args })
                    : undefined,
        },
    };
    const globals = {
        HTMLInputElement: Input,
        HTMLSelectElement: Select,
        AbortController,
        structuredClone,
        window: { addEventListener() {}, removeEventListener() {} },
    };
    const security = loadTestModule(
        new URL("../../../app/administration/security.js", import.meta.url),
        {
            "../../reuse/api-client.js": { apiFetch },
            "../../reuse/i18n.js": i18nModule,
            "../../reuse/escape-html.js": { escapeHtml: String },
            "../../reuse/duration-input.js": duration,
            "../../reuse/info-tooltip.js": { renderInfoTooltip: () => "" },
            "/static/gateways/auth/password-policy.js": {
                DEFAULT_PASSWORD_POLICY: {
                    minLength: 8,
                    requireUppercase: 0,
                    requireLowercase: 0,
                    requireDigit: 0,
                    requireSpecial: 0,
                },
                normalizePasswordPolicy: (value) => ({ ...value }),
                parsePolicyCount: (value, min, fallback) =>
                    Number.isFinite(Number(value))
                        ? Math.max(min, Number(value))
                        : fallback,
            },
            "../../reuse/trusted-domains.js": {
                normalizeTrustedDomains: (values) =>
                    values.map((value) => value.trim()).filter(Boolean),
                clearTrustedDomainsCache: () =>
                    events.push({ kind: "clear-cache" }),
            },
            "../../reuse/ui-ctx.js": { uiCtx },
        },
        globals,
    );
    const unsaved = loadTestModule(
        new URL("../../../reuse/unsaved-changes.js", import.meta.url),
        {
            "./escape-html.js": { escapeHtml: String },
            "./i18n.js": i18nModule,
        },
        globals,
    );
    const overrides = {
        uiCtx,
        guides: [],
        apiFetch,
        ...i18nModule,
        escapeHtml: String,
        createAdministrationReloaders,
        createAdministrationSave,
        initSecuritySection: (...args) =>
            (section = security.initSecuritySection(...args)),
        createUnsavedChangesBar: unsaved.createUnsavedChangesBar,
        mountWhenDirect: async () => {},
        loadModules: async () => [],
        loadHealth: async () => ({}),
        loadIntegrity: async () => [],
        loadGateways: async () => [],
        loadAllAdapters: async () => [],
        loadAdminSections: async () => [{ id: "registration" }],
        loadGatewaySection: async (metadata, options) => {
            contributionOptions = options;
            if (createContribution) return createContribution(options);
            return {
                id: metadata.id,
                label: "Registration",
                subComposerOptions: { elements: [] },
                isDirty: () => contributionDirty,
                save: async () => {
                    events.push({ kind: "registration-save" });
                    if (contributionFails)
                        throw new Error("registration_failed");
                    contributionDirty = false;
                },
                discard: () => {
                    contributionDirty = false;
                },
            };
        },
        createPageComposer: (element, options) => {
            assert.equal(element, root);
            config = options;
            return {
                init: async () => {},
                getFloatingSlot: () => slot,
                refresh: async () => {},
            };
        },
        openPopup: async (options) => {
            events.push({ kind: "popup", options });
            return navigationDecision;
        },
        syncRuntimeToggleControls() {},
        showToast: (message, options) =>
            events.push({ kind: "toast", message, ...options }),
    };
    const contracts = JSON.parse(
        await readFile(new URL("./imports.json", import.meta.url), "utf8"),
    );
    const imports = Object.fromEntries(
        Object.entries(contracts).map(([specifier, names]) => [
            specifier,
            Object.fromEntries(
                names.map((name) => [
                    name,
                    overrides[name] ??
                        (() => {
                            throw new Error(
                                `Unexpected dependency: ${specifier}:${name}`,
                            );
                        }),
                ]),
            ),
        ]),
    );
    const page = await importTestModule(
        new URL("../../../app/administration/index.js", import.meta.url),
        imports,
        globals,
    );
    await page.mount(root, { signal: lifetime.signal });
    return {
        requests,
        events,
        fields,
        slot,
        abort: () => lifetime.abort(),
        get composerOptions() {
            return config;
        },
        decideNavigation: (decision) => {
            navigationDecision = decision;
        },
        get section() {
            return section;
        },
        writes: () => requests.filter((request) => request.method === "PUT"),
        intercept: (handler) => {
            requestHandler = handler;
        },
        contributionFails: (value) => {
            contributionFails = value;
        },
        dirtyContribution: () => {
            contributionDirty = true;
            contributionOptions.onDirtyChange("registration", true);
        },
        openSecurity: () => {
            visible = true;
            mountFields();
            return config.elements
                .find((element) => element.id === "security")
                .subComposerOptions.onRender();
        },
        hideSecurity: () => {
            visible = false;
            fields.clear();
        },
        edit: async (name, value, type = "input") => {
            const field = fields.get(`#security-${name}`);
            if (typeof value === "boolean") field.checked = value;
            else field.value = String(value);
            await field.fire(type);
        },
        save: () => save.fire("click"),
        discard: () => discard.fire("click"),
    };
}
