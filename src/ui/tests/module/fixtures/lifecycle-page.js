import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import { flowHost } from "../../../reuse/tests/fixtures/flow-host.js";

const root =
    process.env.COGNIS_MODULE_OUTCOME_SOURCE ??
    path.resolve(new URL("../../../../..", import.meta.url).pathname);
const moduleId = "study-language-en";
const moduleUuid = "b1adc29f-9d54-5785-9bea-2ce76f1981e4";
const sleep = (duration) =>
    new Promise((resolve) => setTimeout(resolve, duration));
export const until = async (predicate, label, duration = 2000) => {
    const end = Date.now() + duration;
    while (!predicate() && Date.now() < end) await sleep(5);
    assert.ok(predicate(), label);
};

export async function fixture({
    failEnable = false,
    stallEnable = false,
    stallRead = false,
    locale = "en",
    readFailure = false,
    removed = false,
    initialStatus = "disabled",
    moduleStatuses = [],
    moduleCount = 1,
    configurationCancelled = false,
    integrityRequired = false,
    configurationBarrier = 0,
    guidanceFailure = false,
    dependencyFlow = false,
    optionalDependencies = false,
    updateAvailable = false,
    configurationRouteAvailable = false,
    savePreferences = false,
    installationFailure,
} = {}) {
    const dom = new JSDOM(
        '<!doctype html><html><body><main id="app"></main></body></html>',
        {
            url: "https://synthetic.invalid/administration/modules",
            pretendToBeVisual: true,
        },
    );
    const { window } = dom;
    window.localStorage.setItem(
        "cognis_access_token",
        "synthetic-fixture-only",
    );
    let persisted = moduleStatuses[0] ?? initialStatus;
    let configurationValues = {};
    const extraStates = new Map();
    const mutationRequests = [];
    const host = flowHost();
    let enableRequest;
    let readCount = 0;
    let configReads = 0;
    let configRequest;
    let installationRequest;
    let restartRequired = false;
    const popups = [];
    const dependencyPopups = [];
    const requests = [];
    const toasts = [];
    const errors = [];
    const refreshes = [];
    const lifecycle = [];
    const controllers = [];
    const contractCalls = [];
    const translations = new Map([["fixture.module.name", "English Study"]]);
    for (const relative of [
        `src/ui/languages/${locale}/strings.xml`,
        `src/ui/app/modules/languages/${locale}/strings.xml`,
    ]) {
        const xml = new window.DOMParser().parseFromString(
            await fs.readFile(path.join(root, relative), "utf8"),
            "text/xml",
        );
        for (const node of xml.querySelectorAll("string"))
            translations.set(node.getAttribute("name"), node.textContent);
    }
    const i18n = {
        locale,
        t(key) {
            if (!translations.has(key))
                throw Object.assign(new Error(`missing_translation:${key}`), {
                    code: "missing_translation",
                    key,
                });
            return translations.get(key);
        },
    };
    const record = (index = 0) => ({
        id: index ? `fixture-module-${index}` : moduleId,
        uuid: index
            ? `00000000-0000-0000-0000-00000000000${index}`
            : moduleUuid,
        name: "fixture.module.name",
        installed: true,
        hardDependencies:
            dependencyFlow && index === 1 && !optionalDependencies
                ? [moduleUuid]
                : [],
        softDependencies:
            dependencyFlow && index === 1 && optionalDependencies
                ? [moduleUuid]
                : [],
        status: index
            ? (extraStates.get(index) ?? moduleStatuses[index] ?? initialStatus)
            : persisted,
        version: "1.0.0",
        updateAvailable,
        restartRequired,
        categories: [],
        tags: [],
        ui: configurationCancelled
            ? {
                  preferences: [
                      {
                          key: "required",
                          type: "text",
                          required: true,
                          labelKey: "fixture.module.name",
                      },
                  ],
              }
            : guidanceFailure
              ? {
                    activationGuidance: {
                        titleKey: "fixture.module.name",
                        steps: [
                            { id: "setup", labelKey: "fixture.module.name" },
                        ],
                    },
                }
              : {},
    });
    const json = (payload, status = 200) =>
        new Response(JSON.stringify(payload), {
            status,
            headers: { "content-type": "application/json" },
        });
    const waitRequest = (signal) => {
        let complete;
        let fail;
        const pending = new Promise((resolve, reject) => {
            fail = reject;
            const abort = () => reject(signal.reason);
            complete = (value) => {
                signal?.removeEventListener("abort", abort);
                resolve(value);
            };
            if (signal?.aborted) abort();
            else signal?.addEventListener("abort", abort, { once: true });
        });
        return { pending, complete, fail };
    };
    const fetch = async (url, options = {}) => {
        requests.push({
            path: String(url),
            method: options.method ?? "GET",
            signal: options.signal,
            at: Date.now(),
        });
        if (options.signal?.aborted) throw options.signal.reason;
        if (String(url) === "/api/v1/system/healthcheck")
            return json({ data: { healthy: true } });
        if (String(url) === "/api/v1/modules/marketplace-state") {
            readCount++;
            if (readFailure && readCount > 1)
                return json({ error: { code: "fixture_read_failure" } }, 503);
            if (stallRead && readCount > 1)
                return waitRequest(options.signal).pending;
            return json({
                data: {
                    sources: [],
                    cached: [],
                    installed: Array.from({ length: moduleCount }, (_, index) =>
                        record(index),
                    ).filter(
                        (entry) =>
                            !(
                                removed &&
                                readCount > 1 &&
                                entry.id === moduleId
                            ),
                    ),
                },
            });
        }
        if (String(url).endsWith("/config")) {
            if (options.method === "PUT") {
                configurationValues = JSON.parse(options.body);
                return json({ data: configurationValues });
            }
            configReads++;
            if (configReads === configurationBarrier) {
                configRequest = waitRequest(options.signal);
                return configRequest.pending;
            }
            return configReads === 1 && !configurationRouteAvailable
                ? json({ error: { code: "fixture_config_unavailable" } }, 404)
                : json({ data: configurationValues });
        }
        if (String(url) === "/api/v1/modules/install") {
            if (installationFailure === "post")
                throw new TypeError(
                    "Synthetic accepted installation response lost",
                );
            if (installationFailure === "rejected-post")
                return json({ error: { code: "module_enabled" } }, 409);
            return json(
                {
                    data: {
                        jobId: "f39d1248-3511-4b85-8a49-c9fc430cab78",
                        status: "pending",
                    },
                },
                202,
            );
        }
        if (
            String(url) ===
            "/api/v1/modules/install/f39d1248-3511-4b85-8a49-c9fc430cab78"
        ) {
            if (installationFailure === "poll")
                throw new TypeError(
                    "Synthetic installation poll response lost",
                );
            if (installationFailure === "missing")
                return json(
                    { error: { code: "module_install_job_not_found" } },
                    404,
                );
            installationRequest = waitRequest(options.signal);
            return installationRequest.pending;
        }
        if (/\/(enable|disable)$/.test(String(url))) {
            const deferred = waitRequest(options.signal);
            enableRequest = {
                ...deferred,
                signal: options.signal,
                path: String(url),
            };
            mutationRequests.push(enableRequest);
            if (stallEnable) persisted = "enabled";
            return deferred.pending;
        }
        if (String(url) === "/api/v1/modules/catalog")
            return json({ data: [], meta: {} });
        throw new Error(`Unexpected synthetic request: ${url}`);
    };
    const unexpected = (name) => () => {
        throw new Error(`Unexpected public dependency: ${name}`);
    };
    const stubs = {
        "src/ui/reuse/i18n.js": {
            createI18n: async () => i18n,
            applyDocumentTitle: () => {},
            extendI18n: async () => i18n,
        },
        "src/ui/reuse/page-composer/index.js": {
            createPageComposer(pageRoot, options) {
                const render = () => {
                    refreshes.push({
                        aborted: options.signal.aborted,
                        route: window.location.pathname,
                    });
                    if (!options.signal.aborted)
                        pageRoot.innerHTML =
                            options.elements
                                .map((entry) => entry.render())
                                .join("") +
                            (options.floatingMenu ?? [])
                                .map(
                                    (entry) =>
                                        `<div data-fixture-floating-slot="${entry.id}">${entry.render()}</div>`,
                                )
                                .join("");
                };
                return { init: async () => render(), refreshElements: render };
            },
        },
        "src/ui/reuse/page-composer/dom-position.js": {
            getFloatingSlot: (pageRoot, id) =>
                pageRoot.querySelector(`[data-fixture-floating-slot="${id}"]`),
            restoreWindowScrollPosition: () => {},
        },
        "src/ui/reuse/page-entry.js": {
            beginPageLoading: () => () => {},
            mountWhenDirect: async () => {},
        },
        "src/ui/reuse/popup.js": {
            openPopup: async (options) => {
                popups.push(options);
                if (
                    dependencyFlow &&
                    options.title ===
                        i18n.t("ui.app.modules.dependencies_title")
                ) {
                    const overlay = window.document.createElement("div");
                    overlay.innerHTML =
                        options.body +
                        options.actions
                            .map(
                                (action) =>
                                    `<button data-popup-action="${action.id}" ${action.disabled ? "disabled" : ""}></button>`,
                            )
                            .join("");
                    window.document.body.append(overlay);
                    return new Promise((resolve) => {
                        const actions = new Map();
                        for (const button of overlay.querySelectorAll(
                            "[data-install-dependency]",
                        )) {
                            const addListener =
                                button.addEventListener.bind(button);
                            button.addEventListener = (
                                type,
                                handler,
                                options,
                            ) => {
                                if (type === "click")
                                    actions.set(button, handler);
                                return addListener(type, handler, options);
                            };
                        }
                        dependencyPopups.push({
                            overlay,
                            actions,
                            complete: resolve,
                        });
                        options.onOpen?.(overlay, () => resolve("cancel"));
                    });
                }
                if (guidanceFailure)
                    throw new Error("synthetic guidance unavailable");
                if (savePreferences) {
                    const overlay = window.document.createElement("div");
                    overlay.innerHTML = options.body;
                    window.document.body.append(overlay);
                    options.onOpen?.(overlay);
                    await options.onAction("save", overlay);
                    overlay.remove();
                    return "save";
                }
                if (!configurationCancelled && !integrityRequired)
                    unexpected("openPopup")();
                return "cancel";
            },
        },
        "src/ui/reuse/toast.js": {
            showToast: (message, options) =>
                toasts.push({
                    message,
                    options,
                    route: window.location.pathname,
                }),
        },
        "src/ui/reuse/error-reporting.js": {
            reportClientError: unexpected("reportClientError"),
        },
        "src/ui/reuse/form-builder.js": {
            createFormBuilder: configurationCancelled
                ? () => ({
                      render: () =>
                          '<form id="module-preferences-form"><input name="required" value="fixture value"></form>',
                      attach: () => ({ validateAll: () => true, detach() {} }),
                  })
                : unexpected("createFormBuilder"),
        },
        "src/ui/reuse/info-tooltip.js": {
            renderInfoTooltip: unexpected("renderInfoTooltip"),
        },
        "src/ui/reuse/hamburger-menu.js": {
            openHamburgerMenu: unexpected("openHamburgerMenu"),
        },
        "src/ui/reuse/markdown-renderer.js": {
            renderMarkdown: (value) => value,
        },
        "src/ui/reuse/offline-state.js": {
            isOffline: () => false,
            offlineEnabled: () => false,
            setOffline: unexpected("setOffline"),
        },
        "src/ui/reuse/ui-ctx.js": { uiCtx: host.ctx },
    };
    host.ctx.capabilities.contribute("offline:state", {
        isOffline: () => false,
    });
    host.ctx.capabilities.contribute("ui:log", (...values) =>
        errors.push(values),
    );
    const context = vm.createContext({
        window,
        document: window.document,
        localStorage: window.localStorage,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        HTMLButtonElement: window.HTMLButtonElement,
        HTMLElement: window.HTMLElement,
        Event: window.Event,
        CustomEvent: window.CustomEvent,
        DOMException: window.DOMException,
        Headers,
        Response,
        URL,
        fetch,
        setTimeout,
        clearTimeout,
        console: { ...console, error: (...values) => errors.push(values) },
    });
    const cache = new Map();
    async function load(filename) {
        const relative = path.relative(root, filename);
        if (cache.has(filename)) return cache.get(filename);
        const pending = (async () => {
            let loaded;
            if (stubs[relative]) {
                const values = stubs[relative];
                loaded = new vm.SyntheticModule(
                    Object.keys(values),
                    function () {
                        for (const [key, value] of Object.entries(values))
                            this.setExport(key, value);
                    },
                    { context, identifier: pathToFileURL(filename).href },
                );
            } else {
                assert.ok(
                    relative.startsWith("src/ui/app/modules/") ||
                        [
                            "src/ui/reuse/api-client.js",
                            "src/ui/reuse/presentation.js",
                            "src/ui/reuse/escape-html.js",
                            "src/ui/reuse/button-loading.js",
                            "src/ui/reuse/mount-scope.js",
                        ].includes(relative),
                    `Explicit real module boundary: ${relative}`,
                );
                loaded = new vm.SourceTextModule(
                    await fs.readFile(filename, "utf8"),
                    { context, identifier: pathToFileURL(filename).href },
                );
            }
            return loaded;
        })();
        cache.set(filename, pending);
        return pending;
    }
    const entry = await load(path.join(root, "src/ui/app/modules/index.js"));
    await entry.link((specifier, importer) =>
        load(
            path.resolve(
                path.dirname(new URL(importer.identifier).pathname),
                specifier,
            ),
        ),
    );
    await entry.evaluate();
    const pageRoot = window.document.querySelector("#app");
    const addListener = pageRoot.addEventListener.bind(pageRoot);
    let registeredClick;
    pageRoot.addEventListener = (type, handler, options) => {
        if (type === "click") registeredClick = handler;
        return addListener(type, handler, options);
    };
    window.addEventListener("cognis:module-lifecycle-changed", (event) =>
        lifecycle.push(event.detail),
    );
    const mount = async (route = "/administration/modules") => {
        window.history.pushState({}, "", route);
        const controller = new window.AbortController();
        controllers.push(controller);
        await entry.namespace.mount(pageRoot, { signal: controller.signal });
        await until(
            () =>
                pageRoot.querySelector(
                    "[data-module-enable], [data-module-disable], [data-module-recheck]",
                ),
            "module controls rendered",
        );
        return controller;
    };
    await mount();
    return {
        toasts,
        errors,
        mutationRequests,
        popups,
        dependencyPopups,
        requests,
        refreshes,
        lifecycle,
        mount,
        host,
        window,
        pageRoot,
        i18n,
        translations,
        set persisted(value) {
            persisted = value;
        },
        set configurationValues(value) {
            configurationValues = value;
        },
        set readFailure(value) {
            readFailure = value;
        },
        set removed(value) {
            removed = value;
        },
        get configRequest() {
            return configRequest;
        },
        get installationRequest() {
            return installationRequest;
        },
        completeInstallation(status = 200) {
            if (status === 200) restartRequired = true;
            installationRequest.complete(
                json(
                    status === 200
                        ? {
                              data: {
                                  status: "succeeded",
                                  data: {
                                      version: "1.0.1",
                                      restartRequired: true,
                                  },
                              },
                          }
                        : { error: { code: "module_install_failed" } },
                    status,
                ),
            );
        },
        get configReads() {
            return configReads;
        },
        completeConfiguration() {
            configRequest.complete(json({ data: {} }));
        },
        get persisted() {
            return persisted;
        },
        get enableRequest() {
            return enableRequest;
        },
        get reads() {
            return readCount;
        },
        runRegisteredClick() {
            return registeredClick({
                target: pageRoot.querySelector(
                    "[data-module-enable], [data-module-disable]",
                ),
            });
        },
        async clickModule(index) {
            pageRoot
                .querySelector(
                    `[data-module-enable="${record(index).uuid}"], [data-module-disable="${record(index).uuid}"]`,
                )
                .click();
            await new Promise((resolve) => setTimeout(resolve, 10));
        },
        completeMutation(index) {
            const request = mutationRequests[index];
            const match = request.path.match(/fixture-module-(\d+)/);
            const status = request.path.endsWith("/enable")
                ? "enabled"
                : "disabled";
            if (match) extraStates.set(Number(match[1]), status);
            else persisted = status;
            request.complete(json({ data: { status } }));
        },
        async clickEnable() {
            pageRoot
                .querySelector("[data-module-enable], [data-module-disable]")
                .click();
            await until(() => enableRequest, "enable requested");
        },
        navigate() {
            controllers.at(-1).abort();
            window.dispatchEvent(
                new window.CustomEvent("cognis:route-will-change"),
            );
            window.history.pushState({}, "", "/study");
            pageRoot.replaceChildren();
        },
        reject(error = new TypeError("Synthetic network response lost")) {
            enableRequest.fail(error);
        },
        complete() {
            if (integrityRequired)
                enableRequest.complete(
                    json(
                        {
                            error: {
                                code: "module_integrity_acknowledgement_required",
                                integrityFailures: [],
                                integrityToken: "synthetic-integrity",
                            },
                        },
                        409,
                    ),
                );
            else if (failEnable)
                enableRequest.complete(
                    json(
                        {
                            error: {
                                code: "fixture_enable_rejected",
                                message: "Synthetic enable rejection",
                            },
                        },
                        409,
                    ),
                );
            else {
                persisted =
                    initialStatus === "enabled" ? "disabled" : "enabled";
                enableRequest.complete(json({ data: { status: "enabled" } }));
            }
        },
        visible() {
            const button = pageRoot.querySelector(
                "[data-module-enable], [data-module-disable], [data-module-recheck]",
            );
            return button
                ? {
                      action: button.hasAttribute("data-module-recheck")
                          ? "recheck"
                          : button.hasAttribute("data-module-enable")
                            ? "enable"
                            : "disable",
                      text: button.textContent,
                      busy: button.getAttribute("aria-busy"),
                      disabled: button.disabled,
                  }
                : null;
        },
        close() {
            for (const popup of dependencyPopups) popup.complete("cancel");
            for (const controller of controllers) controller.abort();
            window.close();
        },
    };
}
