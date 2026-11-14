import { resolveModuleDependencyErrorMessage } from "./dependencies.js";
import { showToast } from "../../reuse/toast.js";
import { uiCtx } from "../../reuse/ui-ctx.js";
import { performModuleAction } from "./operations.js";
import { loadMarketplaceState, moduleMutationUncertainty } from "./api.js";

const FLOW = "modules:runLifecycleAction";
const CAPABILITY = "ui:moduleLifecycleOutcomes";
const RECONCILE_TIMEOUT_MS = 5_000;
const unreadyModules = new Map();

export function captureModuleAuthority() {
    const identity = () =>
        JSON.stringify([
            globalThis.localStorage?.getItem("cognis_account"),
            globalThis.localStorage?.getItem("cognis_access_token"),
        ]);
    const owner = identity();
    return () => identity() === owner;
}

export function captureModuleOwner({ signal, i18n, currentSignal }) {
    const current = captureModuleAuthority();
    return {
        current,
        signal,
        i18n,
        visible: () =>
            current() && !signal?.aborted && currentSignal() === signal,
    };
}

function installLifecycleFlow() {
    if (uiCtx.capabilities.get(CAPABILITY)) return;
    uiCtx.registerFlow(FLOW, ["authorize", "mutate", "reconcile"]);
    uiCtx.extendFlow(FLOW, "authorize", { id: FLOW }, ({ input, data }) => {
        data.outcome = input.current() ? "pending" : "obsolete";
    });
    uiCtx.extendFlow(FLOW, "mutate", { id: FLOW }, async ({ input, data }) => {
        if (data.outcome !== "pending") return;
        try {
            const result = await performModuleAction(
                input.module,
                input.action,
                {
                    i18n: input.i18n,
                    isCurrent: input.current,
                    isVisible: input.visible,
                    onAcknowledgedState: input.onAcknowledgedState,
                    beforeEnable: input.selection.beforeEnable,
                },
                input.selection,
            );
            data.outcome = result ? "confirmed" : "cancelled";
            if (result) {
                data.status = result.status;
                data.action = result.action;
            }
        } catch (error) {
            if (!input.current()) {
                data.outcome = "obsolete";
                return;
            }
            const mutation = moduleMutationUncertainty(error);
            if (!mutation || mutation.moduleId !== input.module.id) throw error;
            data.outcome = "unknown";
            data.uncertaintyKind = mutation.kind;
            uiCtx.capabilities.get("ui:log")?.(
                "error",
                "module_lifecycle_outcome_unknown",
                {
                    action: input.action,
                    moduleId: input.module.id,
                    kind: mutation.kind,
                    status: error?.status,
                    name: error?.name,
                },
            );
            if (mutation.kind !== "installation")
                data.expectedStatus = mutation.enabled ? "enabled" : "disabled";
        }
        if (!input.current()) data.outcome = "obsolete";
    });
    uiCtx.extendFlow(
        FLOW,
        "reconcile",
        { id: FLOW },
        async ({ input, data }) => {
            if (
                data.outcome !== "unknown" ||
                data.uncertaintyKind === "installation" ||
                !input.current()
            )
                return;
            try {
                // A fresh bounded read, never another mutation or an ETag shortcut.
                const snapshot = await loadMarketplaceState(undefined, {
                    timeoutMs: RECONCILE_TIMEOUT_MS,
                    suppressConnectionRecoveryToast: true,
                });
                if (!input.current()) {
                    data.outcome = "obsolete";
                    return;
                }
                const installed = snapshot?.installed?.find(
                    (entry) =>
                        entry.id === input.module.id &&
                        entry.uuid === input.module.uuid,
                );
                if (installed?.status === data.expectedStatus) {
                    data.outcome = "reconciled";
                    data.status = installed.status;
                }
            } catch (error) {
                uiCtx.capabilities.get("ui:log")?.(
                    "warn",
                    "module_lifecycle_reconciliation_unavailable",
                    {
                        moduleId: input.module.id,
                        status: error?.status,
                        name: error?.name,
                    },
                );
            }
            if (!input.current()) data.outcome = "obsolete";
        },
    );
    uiCtx.capabilities.contribute(CAPABILITY, { flow: FLOW });
}

export async function runModuleLifecycleAction(
    module,
    action,
    owner,
    selection,
) {
    installLifecycleFlow();
    const previous = unreadyModules.get(module.uuid);
    if (previous?.current() && (previous.pending || previous.unresolved))
        return { outcome: "cancelled" };
    const operation = {
        current: owner.current,
        action,
        pending: true,
        unresolved: false,
    };
    unreadyModules.set(module.uuid, operation);
    let result;
    try {
        result = await uiCtx.runFlow(FLOW, {
            module,
            action,
            ...owner,
            selection,
            onAcknowledgedState(status) {
                if (owner.current()) operation.acknowledgedStatus = status;
            },
        });
        return result.data;
    } finally {
        if (unreadyModules.get(module.uuid) === operation) {
            operation.pending = false;
            const outcome = result?.data.outcome;
            const status = result?.data.status ?? operation.acknowledgedStatus;
            if (outcome === "unknown") operation.unresolved = true;
            else if (
                outcome === "obsolete" ||
                status === "disabled" ||
                (outcome === "confirmed" &&
                    ["enable", "disable", "configure", "uninstall"].includes(
                        action,
                    ))
            )
                unreadyModules.delete(module.uuid);
            else if (
                status === "enabled" &&
                (outcome === "reconciled" ||
                    ["enable", "configure"].includes(action))
            )
                operation.unresolved = false;
            else if (previous?.current())
                unreadyModules.set(module.uuid, previous);
            else unreadyModules.delete(module.uuid);
        }
    }
}

export function reportModuleStateReadFailure(error, owner) {
    if (error?.code === "missing_translation") throw error;
    if (!owner.visible()) return;
    uiCtx.capabilities.get("ui:log")?.("warn", "module_state_refresh_failed", {
        status: error?.status,
        name: error?.name,
    });
    showToast(owner.i18n.t("ui.app.modules.state_refresh_failed"), {
        type: "warning",
    });
}

export function reportModuleActionFailure(error, module, action, owner) {
    if (error?.code === "missing_translation") throw error;
    if (!owner.current()) return;
    console.error("module_lifecycle_action_failed", {
        action,
        moduleId: module.id,
        moduleUuid: module.uuid,
        code: error.code,
        status: error.status,
        name: error.name,
    });
    if (!owner.visible()) return;
    const messages = {
        github_connection_timeout: "github_timeout_warning",
        module_install_timeout: "install_timeout",
        module_validation_failed: "validation_failed",
    };
    showToast(
        resolveModuleDependencyErrorMessage(error, owner.i18n) ??
            owner.i18n.t(
                `ui.app.modules.${messages[error.code] ?? "lifecycle_failed"}`,
            ),
        { type: "error" },
    );
}

export function reconcileObservedModuleStates(uncertain, modules, onObserved) {
    for (const module of modules) {
        const readiness = unreadyModules.get(module.uuid);
        if (
            readiness?.current() &&
            !readiness.pending &&
            !readiness.unresolved &&
            module.status === "disabled"
        )
            unreadyModules.delete(module.uuid);
        const pending = uncertain.get(module.uuid);
        if (
            !pending?.current() ||
            pending.uncertaintyKind === "installation" ||
            module.status !== pending.expectedStatus
        )
            continue;
        uncertain.delete(module.uuid);
        if (module.status === "disabled") unreadyModules.delete(module.uuid);
        else
            unreadyModules.set(module.uuid, {
                current: pending.current,
                unresolved: false,
            });
        onObserved(
            module,
            module.status === "enabled" ? "enable" : "disable",
            "observed-state",
        );
    }
}

export function dispatchModuleLifecycleRefresh(
    module,
    action,
    source = "acknowledged-response",
) {
    window.dispatchEvent(
        new CustomEvent("cognis:module-lifecycle-changed", {
            detail: {
                action,
                source,
                moduleId: module.id,
                moduleUuid: module.uuid,
                status: module.status ?? "available",
            },
        }),
    );
    window.dispatchEvent(new Event("cognis:navbar-plugins-refresh"));
    window.dispatchEvent(new Event("cognis:navbar-refresh"));
}

export function modulePendingAction(module) {
    const readiness = unreadyModules.get(module.uuid);
    return readiness?.current() && readiness.pending
        ? readiness.action
        : undefined;
}

export function moduleActivationReady(module, owner) {
    const readiness = unreadyModules.get(module.uuid);
    if (!readiness?.current()) return true;
    if (owner.visible())
        showToast(
            owner.i18n.t(
                readiness.pending || readiness.unresolved
                    ? "ui.app.modules.outcome_unknown"
                    : "ui.app.modules.setup_unconfirmed",
            ),
            {
                type: "warning",
            },
        );
    return false;
}

export function moduleLifecycleUnsettled(module) {
    const readiness = unreadyModules.get(module.uuid);
    return Boolean(
        readiness?.current() && (readiness.pending || readiness.unresolved),
    );
}
