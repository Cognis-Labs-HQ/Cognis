/**
 * Reports owned browser failures and presents component-scoped recovery feedback.
 * Public export: createComponentRecovery — installs the host recovery flow and returns its reporter.
 * @example const report = createComponentRecovery(uiCtx); await report(failure);
 * @param {object} ctx Public browser flow and capability context.
 * @returns {Function} The asynchronous failure reporter.
 */
import { apiFetch } from "./api-client.js";
import { createI18n } from "./i18n.js";

export function createComponentRecovery(ctx) {
    const id = "ui:component:failure";
    if (!ctx.flowExists(id))
        ctx.registerFlow(id, ["report", "notify", "after"]);
    const report = async ({ input, data }) => {
        try {
            const response = await apiFetch("/api/v1/components/failures", {
                method: "POST",
                body: JSON.stringify({
                    scriptUrl: input.scriptUrl,
                    phase: input.providerPhase,
                    occurrenceId: crypto.randomUUID(),
                }),
            });
            if (!response.ok) throw new Error("component_report_failed");
            data.recovery = (await response.json()).data;
        } catch (error) {
            ctx.capabilities.get("ui:log")?.(
                "error",
                "Component failure report failed.",
                {
                    component: "ui",
                    operation: "reportComponentFailure",
                    errorName: error?.name,
                },
            );
        }
    };
    const notify = async ({ input, data }) => {
        const { name, stringsBaseUrl } = input.component;
        if (typeof name !== "string" || !name.trim())
            throw new TypeError("component_display_name_missing");
        const i18n = await createI18n({
            persistLocale: false,
            componentStringBaseUrls: stringsBaseUrl ? [stringsBaseUrl] : [],
        });
        const displayName = stringsBaseUrl ? i18n.t(name) : name;
        ctx.capabilities.get("ui:showToast")(
            i18n
                .t(
                    data.recovery?.disabled
                        ? "ui.components.disabled_after_failures"
                        : "ui.components.provider_failed",
                )
                .replace("{{component}}", () => displayName),
            { variant: "error", minRole: "admin" },
        );
        if (data.recovery?.disabled)
            window.dispatchEvent(
                new CustomEvent("cognis:module-lifecycle-changed"),
            );
    };
    ctx.extendFlow(id, "report", { id }, report);
    ctx.extendFlow(id, "notify", { id }, notify);
    return (failure) => ctx.runFlow(id, failure);
}
