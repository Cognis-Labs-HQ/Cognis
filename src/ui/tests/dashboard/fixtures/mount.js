import assert from "node:assert/strict";
import { importTestModule } from "../../../../tooling/reuse/test-module.ts";
import { replaceMountScope } from "../../../reuse/mount-scope.js";
import { escapeHtml } from "../../../reuse/escape-html.js";

export async function loadDashboard({
    events = [],
    extensions = [],
    clockModule,
    i18nReady,
    onInit,
} = {}) {
    const composers = [];
    const clocks = [];
    const i18n = { t: (key) => key };
    let directMount;
    const { mount } = await importTestModule(
        new URL("../../../app/dashboard/index.js", import.meta.url),
        {
            "../../reuse/offline-state.js": { isOffline: () => false },
            "../../reuse/offline-read-cache.js": {
                createOfflineReadCache: () => (_key, read) => read(),
            },
            "../../reuse/api-client.js": {
                apiFetch: async (path) => {
                    assert.equal(path, "/api/v1/ui/page-extensions/dashboard");
                    return Response.json({ data: [] });
                },
            },
            "../../reuse/i18n.js": {
                createI18n: async () => {
                    await i18nReady;
                    return i18n;
                },
                applyDocumentTitle: (_i18n, key) =>
                    assert.equal(key, "ui.page.title.dashboard"),
            },
            "../../reuse/page-composer/index.js": {
                createPageComposer: (root, options) => {
                    const record = {
                        root,
                        options,
                        refreshed: [],
                        initialized: false,
                        refreshes: 0,
                    };
                    composers.push(record);
                    return {
                        init: async () => {
                            record.initialized = true;
                            await onInit?.(record);
                        },
                        refresh: (elements) => {
                            record.options.elements = elements;
                            record.refreshes++;
                        },
                        refreshElements: (ids) => record.refreshed.push(...ids),
                    };
                },
            },
            "../../reuse/page-entry.js": {
                mountWhenDirect: async (handler) => {
                    directMount = handler;
                },
            },
            "../../reuse/escape-html.js": { escapeHtml },
            "../../reuse/timestamp.js": { formatDateTime: (value) => value },
            "../../reuse/mount-scope.js": { replaceMountScope },
            "../../reuse/clock-display.js": clockModule ?? {
                buildAnalogueClockMarkup: () => "analogue",
                buildDigitalClockMarkup: () => "digital",
                createDateTimeFormatters: () => ({
                    formatDateValue: (value) => value,
                    formatDateTimeValue: (value) => value,
                }),
                mountLiveClock: (options) => clocks.push(options),
            },
            "../../reuse/dynamic-contribution-loader.js": {
                loadDynamicContributions: async (_data, options) => {
                    assert.equal(options.exportName, "createPageElement");
                    assert.equal(options.buildArgs().role, "user");
                    return extensions;
                },
            },
            "../../reuse/ui-ctx.js": {
                uiCtx: {
                    capabilities: {
                        get: (name) => {
                            if (name === "session:getAccountInfo") {
                                return () => ({
                                    createdAt: "2026-01-01",
                                    lastLogin: "2026-11-14",
                                });
                            }
                            if (name === "calendar:dashboardEvents") {
                                return {
                                    loadEventStatusStyles() {},
                                    fetchUpcomingEvents: async (limit) => {
                                        assert.equal(limit, 5);
                                        return events;
                                    },
                                    eventStatusClasses: () => "event-confirmed",
                                };
                            }
                            assert.fail(`Unexpected capability: ${name}`);
                        },
                    },
                },
            },
        },
        {
            localStorage: {
                getItem: (key) =>
                    ({ cognis_account: "account", cognis_role: "user" })[key] ??
                    null,
            },
        },
    );
    assert.equal(directMount, mount);
    return { mount, composers, clocks };
}

export async function mountDashboard(options) {
    const fixture = await loadDashboard(options);
    await fixture.mount({}, { signal: new AbortController().signal });
    await new Promise((resolve) => setImmediate(resolve));
    return { ...fixture, ...fixture.composers[0].options };
}
