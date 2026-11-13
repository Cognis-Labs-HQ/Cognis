import { escapeHtml } from "../../reuse/escape-html.js";
import { extendI18n } from "../../reuse/i18n.js";
import { openPopup } from "../../reuse/popup.js";
import { uiCtx } from "../../reuse/ui-ctx.js";

const COMPONENT_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

function normalizeAdapterTargets(targets) {
    if (!Array.isArray(targets)) return [];
    return targets.filter(
        (target) =>
            target?.kind === "adapter" &&
            COMPONENT_ID_PATTERN.test(String(target.gatewayId ?? "")) &&
            COMPONENT_ID_PATTERN.test(String(target.adapterId ?? "")),
    );
}

export function normalizeActivationGuidance(value) {
    if (!value || typeof value !== "object" || Array.isArray(value))
        return null;
    const titleKey = String(value.titleKey ?? "").trim();
    const steps = Array.isArray(value.steps)
        ? value.steps
              .map((step) => ({
                  id: String(step?.id ?? "").trim(),
                  labelKey: String(step?.labelKey ?? "").trim(),
                  descriptionKey: String(step?.descriptionKey ?? "").trim(),
                  targets: normalizeAdapterTargets(step?.targets),
              }))
              .filter((step) => step.id && step.labelKey)
        : [];
    if (!titleKey || steps.length === 0) return null;
    return {
        titleKey,
        descriptionKey: String(value.descriptionKey ?? "").trim(),
        steps,
    };
}

export async function presentActivationGuidance(module, i18n) {
    const guidance = normalizeActivationGuidance(module.ui?.activationGuidance);
    if (!guidance) return;
    const moduleI18n = await extendI18n(i18n, module.ui?.stringsBaseUrl);
    const description = guidance.descriptionKey
        ? `<p>${escapeHtml(moduleI18n.t(guidance.descriptionKey))}</p>`
        : "";
    const steps = guidance.steps
        .map((step) => {
            const targetList = step.targets.length
                ? `<ul>${step.targets.map((target) => `<li><code>${escapeHtml(target.gatewayId)} / ${escapeHtml(target.adapterId)}</code></li>`).join("")}</ul>`
                : "";
            return `<li><strong>${escapeHtml(moduleI18n.t(step.labelKey))}</strong>${step.descriptionKey ? `<p>${escapeHtml(moduleI18n.t(step.descriptionKey))}</p>` : ""}${targetList}</li>`;
        })
        .join("");
    const action = await openPopup({
        title: moduleI18n.t(guidance.titleKey),
        body: `${description}<ol class="module-activation-guidance">${steps}</ol>`,
        actions: [
            {
                id: "configure",
                label: i18n.t("ui.app.modules.configure_adapters"),
                variant: "confirm",
            },
            {
                id: "later",
                label: i18n.t("ui.app.modules.configure_later"),
                variant: "neutral",
            },
        ],
    });
    if (action === "configure") {
        await uiCtx.capabilities.get("ui:navigate")?.("/administration");
    }
}
