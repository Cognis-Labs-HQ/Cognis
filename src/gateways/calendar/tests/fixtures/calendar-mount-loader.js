import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as renderScope from "../../ui/app/render-scope.js";

export async function loadCalendarMount({ hold, signal }) {
    const reached = [];
    const renderBoundary = new Error("calendar_render_boundary");
    const unexpected = () => {
        throw new Error("unexpected calendar dependency");
    };
    const contracts = {
        "../offline-client.js": { calendarFetch: unexpected },
        "/static/reuse/offline-state.js": { isOffline: () => false },
        "./render-scope.js": renderScope,
        "/static/reuse/i18n.js": {
            createI18n: async () => {
                reached.push("locale");
                await hold("locale");
                return { t: (key) => key };
            },
            applyDocumentTitle: () => reached.push("title"),
        },
        "/static/reuse/page-composer/index.js": {
            createPageComposer: unexpected,
        },
        "/static/reuse/search-util/popup.js": {
            registerSearchIndex: () => {
                reached.push("render");
                throw renderBoundary;
            },
        },
        "/static/reuse/timestamp.js": { formatDateTime: unexpected },
        "/static/reuse/toast.js": { showToast: () => reached.push("toast") },
        "/static/reuse/popup.js": { openPopup: unexpected },
        "/static/reuse/escape-html.js": { escapeHtml: unexpected },
        "/static/reuse/form-builder.js": { createFormBuilder: unexpected },
        "/static/reuse/ui-ctx.js": { uiCtx: {} },
        "./popup-manager.js": {
            createCalendarPopupManager: () => {
                reached.push("render");
                throw renderBoundary;
            },
        },
        "../share-renderer.js": { mount: unexpected },
        "../calendar-ui-helpers.js": {
            parseCalendarSelection: () => null,
            parseEventSelection: () => null,
            CALENDAR_VIEWS: ["month"],
            fetchCalendarState: async () => {
                reached.push("calendars");
                await hold("calendars");
                return { calendars: [{ id: "fixture-calendar" }], meta: {} };
            },
            setEventStatusOptions: () => reached.push("statuses"),
            fetchEvents: async () => {
                reached.push("events");
                await hold("events");
                return [];
            },
            fetchInvitations: async () => {
                reached.push("invitations");
                await hold("invitations");
                return [];
            },
        },
    };
    const context = vm.createContext({
        Date,
        Map,
        Set,
        console,
        window: {
            localStorage: { getItem: () => null },
            clearTimeout: () => reached.push("clearTimer"),
        },
    });
    const module = new vm.SourceTextModule(
        await readFile(
            new URL("../../ui/app/index.js", import.meta.url),
            "utf8",
        ),
        { context },
    );
    await module.link((specifier) => {
        const contract = contracts[specifier];
        if (!contract) throw new Error(`unexpected module: ${specifier}`);
        return new vm.SyntheticModule(
            Object.keys(contract),
            function () {
                for (const [name, value] of Object.entries(contract))
                    this.setExport(name, value);
            },
            { context },
        );
    });
    await module.evaluate();
    return {
        run: () => module.namespace.mount({}, { signal }),
        reached,
        renderBoundary,
    };
}
