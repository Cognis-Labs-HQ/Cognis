import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

function fields(panel) {
    return [
        ...panel.querySelectorAll("input[name], select[name], textarea[name]"),
    ];
}

function fieldKey(field) {
    return `${field.name}:${field.type === "checkbox" ? field.value : ""}`;
}

function read(panel) {
    return Object.fromEntries(
        fields(panel).map((field) => [
            fieldKey(field),
            field.type === "checkbox" ? field.checked : field.value,
        ]),
    );
}

function restore(panel, snapshot) {
    for (const field of fields(panel)) {
        const value = snapshot[fieldKey(field)];
        if (field.type === "checkbox") field.checked = value;
        else field.value = value;
    }
}

/**
 * Own memory-only compose drafts, bindings and one explicit mutation at a time.
 * @param {{ id: string, onDirtyChange?: Function, submitSelector: string }} options
 * @returns {object} Draft state, mounted identity guards and explicit operation lifecycle.
 */
export function createAdminDraft({ id, onDirtyChange, submitSelector }) {
    const assertAccount = captureAccountGuard();
    let ownerValid = true;
    let binding = null;
    let pending = null;
    let initial = null;
    let snapshot = null;

    function accountCurrent() {
        if (!ownerValid) return false;
        try {
            assertAccount();
            return true;
        } catch {
            ownerValid = false;
            snapshot = null;
            initial = null;
            if (binding) {
                const panel = binding.panel;
                unmount();
                panel.replaceChildren();
                if (panel.isConnected) onDirtyChange?.(id, false);
            }
            return false;
        }
    }

    function isDirty() {
        return (
            accountCurrent() &&
            JSON.stringify(snapshot) !== JSON.stringify(initial)
        );
    }

    function changed() {
        onDirtyChange?.(id, isDirty());
    }

    function current(candidate = binding) {
        return (
            accountCurrent() &&
            candidate !== null &&
            candidate === binding &&
            !candidate.signal.aborted &&
            candidate.panel.isConnected
        );
    }

    function sync() {
        if (!current()) return;
        snapshot = read(binding.panel);
        changed();
    }

    function busy() {
        if (!binding) return;
        for (const button of binding.panel.querySelectorAll(submitSelector)) {
            button.disabled = pending !== null || !ownerValid;
            button.setAttribute("aria-busy", String(pending !== null));
        }
    }

    function unmount() {
        binding?.controller.abort();
        binding = null;
        if (pending) {
            pending.cancelled = true;
            pending.controller.abort();
        }
    }

    function bind(panel) {
        if (!accountCurrent()) return null;
        if (binding?.panel === panel && current()) return null;
        binding?.controller.abort();
        const controller = new AbortController();
        binding = { panel, controller, signal: controller.signal };
        if (pending && !pending.cancelled) pending.binding = binding;
        if (snapshot === null) {
            snapshot = read(panel);
            initial = { ...snapshot };
        } else {
            restore(panel, snapshot);
        }
        window.addEventListener(
            "storage",
            (event) => {
                if (
                    event.key === null ||
                    event.key === "cognis_account" ||
                    event.key === "cognis_access_token"
                )
                    accountCurrent();
            },
            { signal: binding.signal },
        );
        panel.addEventListener("input", sync, { signal: binding.signal });
        panel.addEventListener("change", sync, { signal: binding.signal });
        busy();
        changed();
        return binding;
    }

    function begin(candidate) {
        if (!current(candidate) || pending) return null;
        sync();
        const controller = new AbortController();
        pending = {
            binding: candidate,
            snapshot: { ...snapshot },
            controller,
            signal: controller.signal,
            cancelled: false,
        };
        busy();
        return pending;
    }

    function owns(operation) {
        return (
            operation === pending &&
            !operation.cancelled &&
            current(operation.binding)
        );
    }

    function accept(operation) {
        if (!owns(operation)) return;
        sync();
        if (JSON.stringify(snapshot) === JSON.stringify(operation.snapshot)) {
            snapshot = { ...initial };
            restore(binding.panel, snapshot);
            changed();
        }
    }

    function finish(operation) {
        if (operation !== pending) return;
        pending = null;
        busy();
    }

    function discard() {
        if (!accountCurrent()) return;
        if (pending) {
            pending.cancelled = true;
            pending.controller.abort();
        }
        snapshot = initial && { ...initial };
        if (current()) restore(binding.panel, snapshot);
        changed();
    }

    function log(level, operation, context = {}) {
        uiCtx.capabilities.get("ui:log")?.(level, `notify_admin_${operation}`, {
            component: "notify",
            section: id,
            operation,
            ...context,
        });
    }

    return {
        active: accountCurrent,
        bind,
        current,
        begin,
        owns,
        accept,
        finish,
        discard,
        isDirty,
        unmount,
        log,
    };
}
