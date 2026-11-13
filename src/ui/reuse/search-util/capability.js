/**
 * CTX-backed search capability registration and stage execution.
 *
 * @module reuse/search-util/capability
 */

import { uiCtx } from "../ui-ctx.js";
import "../flow-registry.js";

function normalizeSearchOptions(options = {}) {
    return {
        wholeWord: Boolean(options.wholeWord),
        regex: Boolean(options.regex),
        caseSensitive: Boolean(options.caseSensitive),
        onThisPage: Boolean(options.onThisPage),
    };
}

function createSearchCapability() {
    const avenuesByComponent = new Map();

    function normalizeComponentId(componentId) {
        return String(componentId ?? "").trim();
    }

    function normalizeAvenue(componentId, avenue = {}) {
        const normalizedComponentId = normalizeComponentId(componentId);
        const categoryId = String(
            avenue.categoryId ?? avenue.category ?? avenue.id ?? componentId,
        ).trim();
        const provider = avenue.provider ?? avenue.search ?? avenue.run;
        if (
            !normalizedComponentId ||
            !categoryId ||
            typeof provider !== "function"
        ) {
            return null;
        }
        return {
            ...avenue,
            id: String(avenue.id ?? categoryId).trim() || categoryId,
            componentId: normalizedComponentId,
            categoryId,
            stageId: String(avenue.stageId ?? "component-indexes").trim(),
            provider,
        };
    }

    function registerAvenue(componentId, avenue) {
        const normalizedAvenue = normalizeAvenue(componentId, avenue);
        if (!normalizedAvenue) return () => {};
        const componentAvenues =
            avenuesByComponent.get(normalizedAvenue.componentId) ?? [];
        const nextAvenues = componentAvenues.filter(
            (existingAvenue) => existingAvenue.id !== normalizedAvenue.id,
        );
        nextAvenues.push(normalizedAvenue);
        avenuesByComponent.set(normalizedAvenue.componentId, nextAvenues);
        return () => {
            const currentAvenues =
                avenuesByComponent.get(normalizedAvenue.componentId) ?? [];
            const remainingAvenues = currentAvenues.filter(
                (existingAvenue) => existingAvenue.id !== normalizedAvenue.id,
            );
            if (remainingAvenues.length) {
                avenuesByComponent.set(
                    normalizedAvenue.componentId,
                    remainingAvenues,
                );
            } else {
                avenuesByComponent.delete(normalizedAvenue.componentId);
            }
        };
    }

    function getAvenues(stageId = "") {
        return Array.from(avenuesByComponent.values())
            .flat()
            .filter((avenue) => !stageId || avenue.stageId === String(stageId));
    }

    async function runAvenue(avenue, providerContext) {
        const controller = new AbortController();
        const parentSignal = providerContext?.signal;
        const abort = () => controller.abort(parentSignal.reason);
        if (parentSignal?.aborted) abort();
        else parentSignal?.addEventListener("abort", abort, { once: true });
        let timeout;
        let onAbort;
        try {
            const deadline = new Promise((_, reject) => {
                onAbort = () =>
                    reject(
                        controller.signal.reason ??
                            new DOMException("Search cancelled", "AbortError"),
                    );
                controller.signal.addEventListener("abort", onAbort, {
                    once: true,
                });
                if (controller.signal.aborted) onAbort();
                timeout = setTimeout(
                    () =>
                        controller.abort(
                            new DOMException(
                                "Search provider timed out",
                                "TimeoutError",
                            ),
                        ),
                    3_000,
                );
            });
            return await Promise.race([
                Promise.resolve().then(() => {
                    controller.signal.throwIfAborted();
                    return avenue.provider({
                        ...providerContext,
                        signal: controller.signal,
                        onResults: (results) => {
                            if (!controller.signal.aborted)
                                providerContext?.onResults?.(results);
                        },
                        componentId: avenue.componentId,
                        categoryId: avenue.categoryId,
                        avenueId: avenue.id,
                        stageId: avenue.stageId,
                    });
                }),
                deadline,
            ]);
        } finally {
            controller.abort();
            clearTimeout(timeout);
            parentSignal?.removeEventListener("abort", abort);
            controller.signal.removeEventListener("abort", onAbort);
        }
    }

    async function runStage(stageContext) {
        const providerContext = {
            query: stageContext?.input?.query ?? "",
            signal: stageContext?.input?.signal,
            searchOptions: normalizeSearchOptions(
                stageContext?.input?.searchOptions,
            ),
        };
        const results = await Promise.allSettled(
            getAvenues(stageContext?.stageId).map((avenue) =>
                runAvenue(avenue, providerContext).catch((error) => {
                    console.warn("[search-bar]:avenue-failed", {
                        componentId: avenue.componentId,
                        avenueId: avenue.id,
                        error,
                    });
                    return null;
                }),
            ),
        );
        return results
            .filter((result) => result.status === "fulfilled")
            .map((result) => result.value)
            .filter(Boolean);
    }

    return {
        avenuesByComponent,
        registerAvenue,
        getAvenues,
        runAvenue,
        runStage,
    };
}

function ensureSearchCapability() {
    uiCtx.capabilities ??= {};
    uiCtx.capabilities.search ??= createSearchCapability();
    return uiCtx.capabilities.search;
}

export const search = ensureSearchCapability();
