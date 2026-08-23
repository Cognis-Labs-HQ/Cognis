import test from "node:test";
import assert from "node:assert/strict";

test("component pages resolve only by matching UUID, route ID, and opt-in", async () => {
    globalThis.localStorage = { getItem: () => "test-token" };
    globalThis.window = {
        location: { origin: "https://cognis.test" },
        dispatchEvent() {},
    };
    globalThis.fetch = async () =>
        new Response(
            JSON.stringify({
                data: [
                    {
                        id: "whiteboard.canvas",
                        ownerUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                        pattern: "^/whiteboards/[^/]+$",
                        base: "/whiteboards",
                        scriptUrl: "/static/modules/whiteboard/app.js",
                        componentPage: {
                            labelKey: "module.whiteboard.canvas_label",
                            descriptionKey:
                                "module.whiteboard.canvas_description",
                            modes: ["fullscreen"],
                        },
                    },
                    {
                        id: "private.settings",
                        ownerUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                        pattern: "^/private$",
                        base: "/private",
                        scriptUrl: "/private.js",
                    },
                ],
            }),
            { status: 200, headers: { "content-type": "application/json" } },
        );
    const { resolveComponentPage } = await import("../spa-route-registry.js");
    const { installComponentPageBroker } =
        await import("../component-page-broker.js");
    const { uiCtx } = await import("../ui-ctx.js");
    installComponentPageBroker({
        resolveLocal: async ({ componentUuid, routeId }) =>
            componentUuid === "b4d49c4a-61d0-5db2-84fd-f89b80fd6398" &&
            routeId === "core.dashboard"
                ? { id: routeId, load: async () => ({}) }
                : null,
    });
    assert.equal(
        (
            await resolveComponentPage({
                componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                routeId: "whiteboard.canvas",
            })
        )?.id,
        "whiteboard.canvas",
    );
    assert.equal(
        await resolveComponentPage({
            componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
            routeId: "private.settings",
        }),
        null,
    );
    const requestPage = uiCtx.capabilities.get("component-pages:request");
    assert.equal(
        (
            await requestPage({
                componentUuid: "b4d49c4a-61d0-5db2-84fd-f89b80fd6398",
                routeId: "core.dashboard",
            })
        )?.id,
        "core.dashboard",
    );
    assert.equal(
        (
            await requestPage({
                componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
                routeId: "whiteboard.canvas",
                mode: "fullscreen",
                context: { meetingId: "meeting-1" },
            })
        )?.requestContext?.meetingId,
        "meeting-1",
    );
    assert.equal(
        await resolveComponentPage({
            componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
            routeId: "whiteboard.canvas",
            mode: "pip",
        }),
        null,
    );
    assert.equal(
        await resolveComponentPage({
            componentUuid: "not-a-uuid",
            routeId: "whiteboard.canvas",
        }),
        null,
    );
});
