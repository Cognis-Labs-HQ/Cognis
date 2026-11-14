import test from "node:test";
import assert from "node:assert/strict";
import { createCtx } from "@cognis/core";
import { installI18nEnvironment } from "./fixtures/i18n-environment.js";
import { createComponentRecovery } from "../component-recovery.js";

// The real i18n loader, request client and staged flow run against public HTTP/DOM boundaries.
test("component recovery localizes authoritative display names and restricts operational toasts", async (context) => {
    const globals = Object.fromEntries(
        ["localStorage", "window", "document", "DOMParser", "fetch"].map(
            (key) => [key, globalThis[key]],
        ),
    );
    context.after(() => Object.assign(globalThis, globals));
    let disabled = false;
    const environment = installI18nEnvironment((path, options) => {
        if (path === "/api/v1/components/failures") {
            assert.equal(options.method, "POST");
            const report = JSON.parse(options.body);
            assert.equal(
                report.scriptUrl,
                "/static/modules/whiteboard/provider.js",
            );
            assert.equal(report.phase, "mount");
            assert.ok(report.occurrenceId);
            return Response.json({ data: { disabled } });
        }
        if (String(path).includes("/static/modules/whiteboard/languages/"))
            return new Response(
                '<resources><string name="module.board.name">Whiteboard $&amp;</string></resources>',
            );
        if (String(path).startsWith("/static/languages/"))
            return new Response(
                '<resources><string name="ui.components.provider_failed">The {{component}} component failed.</string><string name="ui.components.disabled_after_failures">Disabled {{component}} after failures.</string></resources>',
            );
        return Response.json({ data: [] });
    });
    environment.storage.set("cognis_access_token", "test-token");
    const core = createCtx();
    const toasts = [];
    const ctx = {
        flowExists: (id) => core.hasFlow(id),
        registerFlow: (id, stages) => core.registerFlow({ id, stages }),
        extendFlow: (...args) => core.flow.extend(...args),
        runFlow: (...args) => core.flow.run(...args),
        capabilities: {
            get: (id) =>
                id === "ui:showToast"
                    ? (...args) => toasts.push(args)
                    : undefined,
        },
    };
    const report = createComponentRecovery(ctx);
    const failure = {
        scriptUrl: "/static/modules/whiteboard/provider.js",
        providerPhase: "mount",
        component: {
            id: "whiteboard",
            type: "module",
            name: "module.board.name",
            stringsBaseUrl: "/static/modules/whiteboard/languages",
        },
    };
    await report(failure);
    // This fixture parser preserves XML entities; interpolation must preserve the entire returned value.
    assert.equal(toasts[0][0], "The Whiteboard $&amp; component failed.");
    assert.deepEqual(toasts[0][1], { variant: "error", minRole: "admin" });
    disabled = true;
    await report({
        ...failure,
        component: {
            ...failure.component,
            name: "Analytics",
            stringsBaseUrl: undefined,
        },
    });
    assert.equal(toasts[1][0], "Disabled Analytics after failures.");
    await assert.rejects(
        report({ ...failure, component: { id: "opaque" } }),
        /component_display_name_missing/,
    );
    assert.equal(toasts.length, 2);
    assert.equal(core.hasFlow("ui:component:failure"), true);
    assert.ok(
        environment.requests.some(({ path }) =>
            String(path).includes("/static/modules/whiteboard/languages/"),
        ),
    );
});
