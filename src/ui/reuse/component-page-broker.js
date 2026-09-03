/**
 * Resolves and explicitly spawns pages exposed for component embedding.
 *
 * Public exports:
 * - `requestComponentPage` — resolves an eligible page without mounting it.
 * - `spawnComponentPage` — mounts an eligible page in a protected caller-owned stage.
 * - `discardComponentPage` — tears down the component window in a stage.
 * - `discardAllComponentPages` — tears down every active component window.
 * - `installComponentPageBroker` — registers browser flow hooks and capabilities once.
 *
 * @example
 * const requestPage = uiCtx.capabilities.get("component-pages:request");
 * const spawnPage = uiCtx.capabilities.get("component-pages:spawn");
 * const page = await requestPage({ componentUuid, routeId });
 * button.addEventListener("click", () => spawnPage({
 *     componentUuid,
 *     routeId,
 *     elementId: "meeting-whiteboard-stage",
 *     borderless: true,
 *     context: { meetingId: "meeting-1" },
 *     signal,
 * }));
 */
import { ensurePageStylesheet } from "./page-styles.js";
import { loadWithSpaImportGuard } from "./page-entry.js";
import { resolveComponentPage } from "./spa-route-registry.js";
import { uiCtx } from "./ui-ctx.js";

const INSTALL_KEY = Symbol.for("cognis.componentPageBrokerInstalled");
const ELEMENT_ID_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/;
const WHEEL_DELTA_LINE = 1;
const WHEEL_DELTA_PAGE = 2;
const activeWindows = new Map();
const borderlessHosts = new WeakMap();

function isAbortSignal(value) {
    return (
        value === null ||
        (typeof value === "object" &&
            typeof value.aborted === "boolean" &&
            typeof value.addEventListener === "function")
    );
}

function defaultSpawnAuthorization() {
    return globalThis.navigator?.userActivation?.isActive === true;
}

function blockNavigation(event) {
    const target = event.target;
    const isNavigation =
        event.type === "submit" || target?.closest?.("a[href], area[href]");
    if (!isNavigation) return;
    event.preventDefault();
    event.stopImmediatePropagation();
}

async function releaseMountResult(result) {
    if (typeof result === "function") {
        await result();
        return;
    }
    const release = result?.destroy ?? result?.unmount;
    if (typeof release === "function") await release.call(result);
}

function keepPageScrollFocused(element, signal) {
    element.addEventListener(
        "wheel",
        (event) => {
            const scale =
                event.deltaMode === WHEEL_DELTA_LINE
                    ? 16
                    : event.deltaMode === WHEEL_DELTA_PAGE
                      ? window.innerHeight
                      : 1;
            event.preventDefault();
            event.stopImmediatePropagation();
            window.scrollBy({
                left: event.deltaX * scale,
                top: event.deltaY * scale,
                behavior: "auto",
            });
        },
        { capture: true, passive: false, signal },
    );
}

function activateBorderlessHost(stage) {
    const host = stage.closest?.(".app-page__main");
    if (!host) return () => {};
    borderlessHosts.set(host, (borderlessHosts.get(host) ?? 0) + 1);
    host.classList.add("app-page__main--component-borderless");
    return () => {
        const remaining = Math.max((borderlessHosts.get(host) ?? 1) - 1, 0);
        if (remaining > 0) {
            borderlessHosts.set(host, remaining);
            return;
        }
        borderlessHosts.delete(host);
        host.classList.remove("app-page__main--component-borderless");
    };
}

/**
 * Resolves an eligible component page without mounting it.
 *
 * @param {{componentUuid: string, routeId: string, mode?: string, context?: object}} request
 * @returns {Promise<object | null>} An eligible route descriptor or null.
 */
export async function requestComponentPage(request) {
    const result = await uiCtx.runFlow("request-component-page", request);
    return result.data.route ?? null;
}

/**
 * Mounts an eligible component page in a protected, caller-owned stage.
 *
 * @param {{componentUuid: string, routeId: string, elementId: string, mode?: string, context?: object, signal?: AbortSignal, borderless?: boolean, removeStageOnDiscard?: boolean}} request
 * @returns {Promise<{elementId: string, ownerUuid: string, routeId: string, borderless: boolean, restoreHostLayout: () => void, discard: () => Promise<void>} | null>} A mounted component-window handle or null.
 */
export async function spawnComponentPage(request) {
    const result = await uiCtx.runFlow("spawn-component-page", request);
    return result.data.window ?? null;
}

/**
 * Discards the active component window mounted in an element.
 *
 * @param {string} elementId
 * @returns {Promise<boolean>} Whether an active component window was discarded.
 */
export async function discardComponentPage(elementId) {
    const normalizedElementId = String(elementId ?? "").trim();
    const activeWindow = activeWindows.get(normalizedElementId);
    if (!activeWindow) return false;
    await activeWindow.discard();
    return true;
}

/**
 * Discards every active component window before the SPA replaces page content.
 *
 * @returns {Promise<void>}
 */
export async function discardAllComponentPages() {
    await Promise.all(
        [...activeWindows.values()].map((activeWindow) =>
            activeWindow.discard(),
        ),
    );
}

/**
 * Installs component-page flow hooks and optionally resolves built-in pages.
 *
 * @param {{resolveLocal?: (request: object) => Promise<object | null>, authorizeSpawn?: () => boolean}} options
 * @returns {void}
 */
export function installComponentPageBroker({
    resolveLocal,
    authorizeSpawn = defaultSpawnAuthorization,
} = {}) {
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
            data.route = {
                ...data.route,
                requestContext: data.request.context,
            };
        },
    );
    uiCtx.extendFlow(
        "spawn-component-page",
        "validate",
        { id: "core:validate-component-page-spawn" },
        ({ input, data }) => {
            const elementId = String(input?.elementId ?? "").trim();
            const signal = input?.signal ?? null;
            data.request = {
                componentUuid: String(input?.componentUuid ?? "")
                    .trim()
                    .toLowerCase(),
                routeId: String(input?.routeId ?? "").trim(),
                mode: String(input?.mode ?? "").trim() || null,
                context: input?.context ?? null,
                elementId,
                signal,
                borderless: input?.borderless === true,
                removeStageOnDiscard: input?.removeStageOnDiscard === true,
            };
            data.requestValid =
                ELEMENT_ID_PATTERN.test(elementId) &&
                isAbortSignal(signal) &&
                !signal?.aborted;
            data.spawnAuthorized = authorizeSpawn();
        },
    );
    uiCtx.extendFlow(
        "spawn-component-page",
        "resolve",
        { id: "core:resolve-component-page-spawn" },
        async ({ data }) => {
            if (!data.requestValid || !data.spawnAuthorized) return;
            data.route = await requestComponentPage(data.request);
        },
    );
    uiCtx.extendFlow(
        "spawn-component-page",
        "prepare",
        { id: "core:prepare-component-page-stage" },
        async ({ data }) => {
            if (!data.route) return;
            const stage = document.getElementById(data.request.elementId);
            if (!stage) return;
            await discardComponentPage(data.request.elementId);
            const windowElement = document.createElement("section");
            windowElement.className = "component-page-window";
            if (data.request.borderless) {
                windowElement.classList.add(
                    "component-page-window--borderless",
                );
                stage.classList.add("component-page-stage--borderless");
            }
            windowElement.dataset.componentPageOwner =
                data.request.componentUuid;
            windowElement.dataset.componentPageRoute = data.request.routeId;
            windowElement.setAttribute("role", "region");
            stage.classList.add("component-page-stage");
            stage.append(windowElement);
            data.stage = stage;
            data.windowElement = windowElement;
        },
    );
    uiCtx.extendFlow(
        "spawn-component-page",
        "mount",
        { id: "core:mount-component-page" },
        async ({ data }) => {
            if (!data.windowElement || data.request.signal?.aborted) return;
            const controller = new AbortController();
            keepPageScrollFocused(data.windowElement, controller.signal);
            const releaseBorderlessHost = data.request.borderless
                ? activateBorderlessHost(data.stage)
                : () => {};
            let hostLayoutRestored = false;
            const restoreHostLayout = () => {
                if (hostLayoutRestored) return;
                hostLayoutRestored = true;
                releaseBorderlessHost();
            };
            let mountResult;
            let discarded = false;
            let discardOnCallerAbort;
            const discard = async () => {
                if (discarded) return;
                discarded = true;
                controller.abort();
                try {
                    await releaseMountResult(mountResult);
                } catch (error) {
                    console.error("component_page_cleanup_failed", {
                        componentUuid: data.request.componentUuid,
                        routeId: data.request.routeId,
                        elementId: data.request.elementId,
                        error,
                    });
                } finally {
                    restoreHostLayout();
                    data.request.signal?.removeEventListener(
                        "abort",
                        discardOnCallerAbort,
                    );
                    data.windowElement.remove();
                    if (data.request.removeStageOnDiscard) {
                        data.stage.remove();
                    } else if (
                        !data.stage.querySelector?.(".component-page-window")
                    ) {
                        data.stage.classList.remove(
                            "component-page-stage",
                            "component-page-stage--borderless",
                        );
                    }
                    if (
                        activeWindows.get(data.request.elementId)?.discard ===
                        discard
                    ) {
                        activeWindows.delete(data.request.elementId);
                    }
                }
            };
            const handle = {
                elementId: data.request.elementId,
                ownerUuid: data.request.componentUuid,
                routeId: data.request.routeId,
                borderless: data.request.borderless,
                restoreHostLayout,
                discard,
            };
            activeWindows.set(data.request.elementId, handle);
            discardOnCallerAbort = () => void discard();
            data.request.signal?.addEventListener(
                "abort",
                discardOnCallerAbort,
                { once: true },
            );
            data.windowElement.addEventListener("click", blockNavigation, {
                capture: true,
                signal: controller.signal,
            });
            data.windowElement.addEventListener("submit", blockNavigation, {
                capture: true,
                signal: controller.signal,
            });
            try {
                await Promise.all(
                    (data.route.stylesheets ?? []).map(ensurePageStylesheet),
                );
                const module = await loadWithSpaImportGuard(() =>
                    data.route.load({ signal: controller.signal }),
                );
                if (
                    typeof module?.mount !== "function" ||
                    controller.signal.aborted
                ) {
                    await discard();
                    return;
                }
                mountResult = await module.mount(data.windowElement, {
                    ...(data.mountOptions ?? {}),
                    signal: controller.signal,
                    focusState: data.request.context,
                    navigationAllowed: false,
                    borderless: data.request.borderless,
                    layout: {
                        borderless: data.request.borderless,
                        fillParent: data.request.borderless,
                        scrollOwner: "document",
                    },
                });
                if (controller.signal.aborted) {
                    await releaseMountResult(mountResult);
                    return;
                }
                data.window = handle;
            } catch (error) {
                console.error("component_page_mount_failed", {
                    componentUuid: data.request.componentUuid,
                    routeId: data.request.routeId,
                    elementId: data.request.elementId,
                    error,
                });
                await discard();
                throw error;
            }
        },
    );
    uiCtx.capabilities.contribute(
        "component-pages:request",
        requestComponentPage,
    );
    uiCtx.capabilities.contribute("component-pages:spawn", spawnComponentPage);
    uiCtx.capabilities.contribute(
        "component-pages:discard",
        discardComponentPage,
    );
    uiCtx.capabilities.contribute(
        "component-pages:discardAll",
        discardAllComponentPages,
    );
    window.addEventListener("cognis:route-will-change", () => {
        void discardAllComponentPages();
    });
    uiCtx.capabilities.contribute(
        "router:resolveDeclaredRoute",
        async (loader) => {
            if (loader?.kind === "route") {
                return resolveLocal({
                    routeId: loader.routeId,
                    mode: loader.requestedMode,
                });
            }
            if (loader?.kind !== "module-route") return null;
            return requestComponentPage({
                componentUuid: loader.moduleId,
                routeId: loader.routeId,
                mode: loader.requestedMode,
            });
        },
    );
}
