import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";
import { setModuleEnabled } from "./api.js";

function renderFailure(entry, labels) {
    const status =
        entry.status === "missing_shasum"
            ? labels.missingShasum
            : entry.status === "missing"
              ? labels.missingFile
              : labels.mismatch;
    const hashes =
        entry.status === "mismatch"
            ? `<span><strong>${escapeHtml(labels.expected)}:</strong> <code>${escapeHtml(entry.expected ?? "")}</code></span><span><strong>${escapeHtml(labels.actual)}:</strong> <code>${escapeHtml(entry.actual ?? "")}</code></span>`
            : "";
    return `<li><strong>${escapeHtml(entry.file)}</strong><span>${escapeHtml(status)}</span>${hashes}</li>`;
}

export async function enableModuleWithIntegrityAcknowledgement(
    moduleId,
    labels,
) {
    try {
        await setModuleEnabled(moduleId, true);
        return true;
    } catch (error) {
        if (
            error.code !== "module_integrity_acknowledgement_required" ||
            !Array.isArray(error.integrityFailures) ||
            !error.integrityToken
        ) {
            throw error;
        }
        const failures = error.integrityFailures;
        const action = await openPopup({
            title: labels.title,
            body: `<p>${escapeHtml(labels.warning)}</p><ul class="module-integrity-failures">${failures
                .map((entry) => renderFailure(entry, labels))
                .join("")}</ul>`,
            variant: "warning",
            actions: [
                {
                    id: "acknowledge",
                    label: labels.acknowledge,
                    variant: "cancel",
                },
                { id: "cancel", label: labels.cancel, variant: "neutral" },
            ],
        });
        if (action !== "acknowledge") return null;
        await setModuleEnabled(moduleId, true, {
            integrityAcknowledgementToken: error.integrityToken,
        });
        return true;
    }
}
