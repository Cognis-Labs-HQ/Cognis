/**
 * Resolves pages that external components explicitly expose for embedding.
 *
 * Public exports:
 * - `requestComponentPage` — resolves an eligible page by component UUID and route ID.
 * - `installComponentPageBroker` — registers the browser flow hooks and capabilities once.
 *
 * @example
 * const page = await requestComponentPage({
 *     componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
 *     routeId: "whiteboard.canvas",
 *     context: { meetingId: "meeting-1" },
 * });
 *
 * @param {{componentUuid: string, routeId: string, mode?: string, context?: object}} request
 * @returns {Promise<object | null>} An eligible loadable route or null.
 */
import { resolveComponentPage } from "./spa-route-registry.js";
import { uiCtx } from "./ui-ctx.js";

const INSTALL_KEY = Symbol.for("cognis.componentPageBrokerInstalled");

export async function requestComponentPage(request) {
    const result = await uiCtx.runFlow("request-component-page", request);
    return result.data.route ?? null;
}

export function installComponentPageBroker() {
    if (globalThis[INSTALL_KEY]) return;
    globalThis[INSTALL_KEY] = true;
    uiCtx.extendFlow(
        "request-component-page",
        "validate",
        { id: "core:validate-component-page-request" },
        ({ input, data }) => {
            data.request = {
                componentUuid: String(input?.componentUuid ?? "")
                    .trim()
                    .toLowerCase(),
                routeId: String(input?.routeId ?? "").trim(),
                mode: String(input?.mode ?? "").trim() || null,
                context: input?.context ?? null,
            };
        },
    );
    uiCtx.extendFlow(
        "request-component-page",
        "resolve",
        { id: "core:resolve-component-page" },
        async ({ data }) => {
            data.route = await resolveComponentPage(data.request);
        },
    );
    uiCtx.extendFlow(
        "request-component-page",
        "prepare",
        { id: "core:prepare-component-page" },
        ({ data }) => {
            if (data.route) {
                data.route = {
                    ...data.route,
                    requestContext: data.request.context,
                };
            }
        },
    );
    uiCtx.capabilities.contribute(
        "component-pages:request",
        requestComponentPage,
    );
    uiCtx.capabilities.contribute(
        "router:resolveDeclaredRoute",
        async (loader) => {
            if (loader?.kind !== "module-route") return null;
            return requestComponentPage({
                componentUuid: loader.moduleId,
                routeId: loader.routeId,
                mode: loader.requestedMode,
            });
        },
    );
}
