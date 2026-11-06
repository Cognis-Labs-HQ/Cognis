/**
 * Coordinates floating menus through one lifecycle-owned priority queue.
 * Public export: registerFloatingMenus — installs ui:floatingMenus and staged operations.
 * @example const lease = await queue.request({ signal, priority: 100 }); await lease.present(menu); await lease.dispose();
 * @param {object} ctx Browser capability and staged-flow context.
 * @returns {object} Queue contract with request(), where each lease exposes ready, present(), dismiss() and dispose().
 */
export function registerFloatingMenus(ctx) {
    ctx.signal?.throwIfAborted();
    const existing = ctx.capabilities.get("ui:floatingMenus");
    if (existing) {
        if (existing.version !== 1 || typeof existing.request !== "function")
            throw new Error("floating_menu_contract_unavailable");
        return existing;
    }
    const entries = [];
    const disposers = [];
    let sequence = 0;
    const log = (...args) => ctx.capabilities.get("ui:log")?.(...args);
    const report = (error) => {
        if (!ctx.signal?.aborted)
            log("error", "Floating menu operation failed.", {
                component: "ui",
                operation: "floatingMenu",
                errorName: error?.name,
            });
    };
    function schedule() {
        const active = entries
            .filter((entry) => entry.enabled && !entry.signal?.aborted)
            .sort(
                (a, b) => b.priority - a.priority || a.sequence - b.sequence,
            )[0];
        for (const entry of entries) {
            if (entry.element) entry.element.hidden = entry !== active;
        }
        active?.settle(true);
    }
    function remove(entry) {
        const index = entries.indexOf(entry);
        if (index < 0) return false;
        entries.splice(index, 1);
        entry.signal?.removeEventListener("abort", entry.abort);
        if (entry.element) entry.element.hidden = true;
        entry.settle(false);
        schedule();
        return true;
    }
    function action(name, execute) {
        const id = `ui:floatingMenu:${name}`;
        const dispose = ctx.registerFlow(id, ["validate", "execute", "after"]);
        if (typeof dispose === "function") disposers.push(dispose);
        ctx.extendFlow(id, "validate", { id }, ({ input }) => {
            ctx.signal?.throwIfAborted();
            if (!input || typeof input !== "object")
                throw new TypeError("invalid_floating_menu_request");
        });
        ctx.extendFlow(id, "execute", { id }, ({ input, data }) => {
            data.result = execute(input);
        });
        ctx.extendFlow(id, "after", { id }, () => {
            log("info", "Floating menu queue updated.", {
                component: "ui",
                operation: name,
                pending: entries.length,
            });
        });
        return async (input) => (await ctx.runFlow(id, input)).data.result;
    }
    try {
        const release = action("release", ({ entry }) => remove(entry));
        const present = action(
            "present",
            ({ entry, element, visible = true, revision }) => {
                if (
                    !entries.includes(entry) ||
                    entry.signal?.aborted ||
                    revision !== entry.revision
                )
                    return false;
                if (
                    !element ||
                    typeof element !== "object" ||
                    typeof visible !== "boolean"
                )
                    throw new TypeError("invalid_floating_menu_element");
                if (entry.element && entry.element !== element)
                    entry.element.hidden = true;
                entry.element = element;
                entry.enabled = visible;
                schedule();
                return true;
            },
        );
        const dismiss = action("dismiss", ({ entry, element }) => {
            if (!entries.includes(entry) || entry.element !== element)
                return false;
            entry.element.hidden = true;
            entry.element = null;
            schedule();
            return true;
        });
        const request = action("request", ({ signal, priority = 0 }) => {
            if (!Number.isFinite(priority))
                throw new TypeError("invalid_floating_menu_priority");
            signal?.throwIfAborted();
            let settle;
            const ready = new Promise((resolve) => {
                settle = resolve;
            });
            const entry = {
                signal,
                priority,
                sequence: sequence++,
                settle,
                enabled: true,
                element: null,
                revision: 0,
                pendingElement: null,
            };
            entry.abort = () => {
                void release({ entry }).catch(report);
            };
            signal?.addEventListener("abort", entry.abort, { once: true });
            entries.push(entry);
            schedule();
            return Object.freeze({
                ready,
                present(element, options = {}) {
                    // Invalidate older presentations before extensible flow stages can yield.
                    entry.pendingElement = element;
                    const revision = ++entry.revision;
                    return present({ entry, element, ...options, revision });
                },
                dismiss(element) {
                    if (entry.pendingElement === element) {
                        entry.pendingElement = null;
                        entry.revision++;
                    }
                    return dismiss({ entry, element });
                },
                dispose: () => release({ entry }),
            });
        });
        const queue = Object.freeze({ version: 1, request });
        ctx.capabilities.contribute("ui:floatingMenus", queue);
        ctx.signal?.addEventListener(
            "abort",
            () => {
                for (const entry of entries) entry.enabled = false;
                for (const entry of [...entries]) remove(entry);
                if (ctx.capabilities.get("ui:floatingMenus") === queue)
                    ctx.capabilities.remove("ui:floatingMenus", queue);
                for (const dispose of disposers.reverse()) dispose();
            },
            { once: true },
        );
        return queue;
    } catch (error) {
        for (const dispose of disposers.reverse()) dispose();
        log("error", "Floating menu registration failed.", {
            component: "ui",
            operation: "registerFloatingMenus",
            errorName: error?.name,
        });
        throw error;
    }
}
