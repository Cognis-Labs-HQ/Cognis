/**
 * Resolves pages that external components explicitly expose for embedding.
 *
 * Public exports:
 * - `requestComponentPage` — resolves an eligible page and optionally mounts it in a caller-owned element.
 * - `installComponentPageBroker` — registers the browser flow hooks and capabilities once.
 *
 * @example
 * const page = await requestComponentPage({
 *     componentUuid: "b7bf4a0a-a07a-483e-a736-21f97d703ce6",
 *     routeId: "whiteboard.canvas",
 *     elementId: "meeting-whiteboard",
 *     context: { meetingId: "meeting-1" },
 * });
 *
 * @param {{componentUuid: string, routeId: string, mode?: string, elementId?: string, context?: object, signal?: AbortSignal}} request
 * @returns {Promise<object | null>} An eligible route, optionally mounted in `elementId`, or null.
 */
import { resolveComponentPage } from "./spa-route-registry.js";
import { ensurePageStylesheet } from "./page-styles.js";
import { uiCtx } from "./ui-ctx.js";

const INSTALL_KEY = Symbol.for("cognis.componentPageBrokerInstalled");
const ELEMENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;

function isAbortSignal(value) {
    return (
        value === null ||
        (typeof value === "object" &&
            typeof value.aborted === "boolean" &&
            typeof value.addEventListener === "function")
    );
}

export async function requestComponentPage(request) {
    const result = await uiCtx.runFlow("request-component-page", request);
    return result.data.route ?? null;
}

/**
 * Installs component-page flow hooks and optionally resolves built-in pages.
 *
 * @param {{resolveLocal?: (request: object) => Promise<object | null>}} options
 * @returns {void}
 */
export function installComponentPageBroker({ resolveLocal } = {}) {
    if (globalThis[INSTALL_KEY]) return;
    globalThis[INSTALL_KEY] = true;
    uiCtx.extendFlow(
        "request-component-page",
        "validate",
        { id: "core:validate-component-page-request" },
        ({ input, data }) => {
            const elementId = String(input?.elementId ?? "").trim();
            const signal = input?.signal ?? null;
            data.request = {
                componentUuid: String(input?.componentUuid ?? "")
                    .trim()
                    .toLowerCase(),
                routeId: String(input?.routeId ?? "").trim(),
                mode: String(input?.mode ?? "").trim() || null,
                elementId: elementId || null,
                context: input?.context ?? null,
                signal,
            };
            data.valid =
                (!elementId || ELEMENT_ID_PATTERN.test(elementId)) &&
                isAbortSignal(signal);
        },
    );
    uiCtx.extendFlow(
        "request-component-page",
        "resolve",
        { id: "core:resolve-component-page" },
        async ({ data }) => {
            if (!data.valid) return;
            data.route =
                (await resolveLocal?.(data.request)) ??
                (await resolveComponentPage(data.request));
        },
    );
    uiCtx.extendFlow(
        "request-component-page",
        "prepare",
        { id: "core:prepare-component-page" },
        ({ data }) => {
            if (!data.route) return;
            const { context, elementId } = data.request;
            data.route = {
                ...data.route,
                requestContext: context,
                targetElementId: elementId,
            };
        },
    );
    uiCtx.extendFlow(
        "request-component-page",
        "mount",
        { id: "core:mount-component-page" },
        async ({ data }) => {
            if (!data.route) return;
            const { context, elementId, signal } = data.request;
            if (!elementId) return;
            const target = document.getElementById(elementId);
            if (!target || signal?.aborted) {
                data.route = null;
                return;
            }
            await Promise.all(
                (data.route.stylesheets ?? []).map(ensurePageStylesheet),
            );
            const module = await data.route.load({ signal });
            if (typeof module?.mount !== "function" || signal?.aborted) {
                data.route = null;
                return;
            }
            target.dataset.componentPageOwner = data.request.componentUuid;
            target.dataset.componentPageRoute = data.request.routeId;
            await module.mount(target, {
                signal,
                focusState: context,
            });
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
