/**
 * Client-side flow engine singleton (`uiCtx`) for the Cognis browser shell.
 *
 * Mirrors the server-side `ctx.flow` surface so that cross-cutting browser
 * concerns (session authentication, page loading, SPA navigation) can be
 * expressed as named, staged flows that any gateway or module can extend
 * without owning the flow or coupling to its implementation.
 *
 * Public exports:
 * - `uiCtx` — the singleton flow engine instance.
 * - `registerFlow(id, stages)` — declare a flow contract.
 * - `extendFlow(flowId, stageId, hookMeta, handler)` — add a stage hook.
 * - `runFlow(flowId, input)` — execute all stage hooks in order, returning
 *   accumulated per-stage results.
 * - `flowExists(flowId)` — check whether a flow has been registered.
 *
 * @example
 * ```js
 * import { uiCtx } from '/static/reuse/ui-ctx.js';
 *
 * uiCtx.extendFlow('authenticate-session', 'apply-alternate-auth',
 *   { id: 'my-gateway:apply-alternate-auth' },
 *   async (stageCtx) => { ... },
 * );
 * const result = await uiCtx.runFlow('authenticate-session', {});
 * ```
 */

import { BROWSER_FLOW_CONTRACTS } from "./flow-contracts.js";

function sortHooks(hooks) {
    return [...hooks].sort((left, right) => {
        const orderDiff = (left.order ?? 0) - (right.order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return left.id.localeCompare(right.id);
    });
}

function createFlowEngine() {
    const flows = new Map();
    const capabilityValues = new Map();

    const capabilities = {
        contribute(id, value) {
            const normalizedId = String(id ?? "").trim();
            if (!normalizedId || capabilityValues.has(normalizedId))
                return false;
            capabilityValues.set(normalizedId, value);
            return true;
        },
        get(id) {
            return capabilityValues.get(String(id ?? "").trim());
        },
    };

    function registerFlow(id, stages) {
        const normalizedId = String(id ?? "").trim();
        if (!normalizedId)
            throw new Error("Flow id must be a non-empty string.");
        if (!Array.isArray(stages) || stages.length === 0) {
            throw new Error(
                `Flow "${normalizedId}" must declare at least one stage.`,
            );
        }
        const normalizedStages = stages.map((stageId) => {
            const normalized = String(stageId ?? "").trim();
            if (!normalized)
                throw new Error(
                    `Flow "${normalizedId}" has an invalid stage id.`,
                );
            return normalized;
        });
        const duplicate = normalizedStages.find(
            (stageId, index) => normalizedStages.indexOf(stageId) !== index,
        );
        if (duplicate) {
            throw new Error(
                `Flow "${normalizedId}" has duplicate stage "${duplicate}".`,
            );
        }
        if (flows.has(normalizedId)) {
            throw new Error(`Flow "${normalizedId}" is already registered.`);
        }
        const stageHooks = new Map();
        for (const stageId of normalizedStages) {
            stageHooks.set(stageId, new Map());
        }
        flows.set(normalizedId, { stages: normalizedStages, stageHooks });
    }

    function extendFlow(flowId, stageId, hookMeta, handler) {
        const flow = flows.get(flowId);
        if (!flow) throw new Error(`Flow "${flowId}" is not registered.`);
        const hookId = String(hookMeta?.id ?? "").trim();
        if (!hookId) return false;
        const stageHooks = flow.stageHooks.get(stageId);
        if (!stageHooks) {
            throw new Error(
                `"${stageId}" is not a registered stage in flow "${flowId}".`,
            );
        }
        if (stageHooks.has(hookId)) return false;
        stageHooks.set(hookId, {
            id: hookId,
            order: typeof hookMeta?.order === "number" ? hookMeta.order : 0,
            handler,
        });
        return true;
    }

    async function runFlow(flowId, input) {
        const flow = flows.get(flowId);
        if (!flow) throw new Error(`Flow "${flowId}" is not registered.`);
        const data = {};
        const stageResults = {};
        for (const stageId of flow.stages) {
            const stageHookMap = flow.stageHooks.get(stageId);
            const hooks = sortHooks(Array.from(stageHookMap?.values() ?? []));
            const stageCtx = {
                flowId,
                stageId,
                input,
                data,
                stageResults,
            };
            const currentResults = [];
            for (const hook of hooks) {
                const result = await hook.handler(stageCtx);
                currentResults.push(result);
            }
            stageResults[stageId] = currentResults;
        }
        return { flowId, data, stageResults };
    }

    function flowExists(flowId) {
        return flows.has(flowId);
    }

    return { registerFlow, extendFlow, runFlow, flowExists, capabilities };
}

export const uiCtx = createFlowEngine();

for (const [flowId, stages] of Object.entries(BROWSER_FLOW_CONTRACTS)) {
    uiCtx.registerFlow(flowId, stages);
}

export const { registerFlow, extendFlow, runFlow, flowExists } = uiCtx;
