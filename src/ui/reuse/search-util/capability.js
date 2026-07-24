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
        return avenue.provider({
            ...providerContext,
            componentId: avenue.componentId,
            categoryId: avenue.categoryId,
            avenueId: avenue.id,
            stageId: avenue.stageId,
        });
    }

    async function runStage(stageContext) {
        const providerContext = {
            query: stageContext?.input?.query ?? "",
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

