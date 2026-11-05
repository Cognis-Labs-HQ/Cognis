import { componentLabel } from "../reuse/progress.ts";
import { conciseText } from "../reuse/output-summary.ts";
import { renderStructuredSummary } from "../formatters.ts";

const explanations: Record<string, string> = {
    component_adapter_catalog_failed:
        "Adapter catalog unavailable; inspect or disable the owning gateway.",
    component_revision_unavailable:
        "Cannot compare installed and selected revisions. Use --force to reinstall.",
    component_protected: "Required host component; kept enabled.",
    component_required_dependency:
        "Needed by a protected component; kept enabled.",
    component_managed_by_host:
        "Bundled component; upgrade the Cognis host deployment.",
    component_upgrade_timeout:
        "Installation timed out; check component:info before retrying.",
    component_operation_unavailable:
        "This operation is not offered by the component.",
};

/** Lifecycle output must identify every target without serializing installed manifests. */
export function renderComponentResults(payload: unknown): string {
    const results = (
        payload as { data?: { results?: Array<Record<string, unknown>> } }
    )?.data?.results;
    if (!Array.isArray(results)) return renderStructuredSummary(payload);
    if (!results.length) return "No matching components found.";
    const lines = results.map((result) => {
        const target = (result.target ?? {}) as {
            type?: string;
            id?: string;
            gatewayId?: string;
        };
        const raw = result.data as Record<string, unknown> | undefined;
        const data =
            raw?.data && typeof raw.data === "object"
                ? (raw.data as Record<string, unknown>)
                : raw;
        const identity = componentLabel(
            target,
            result.scope === "adapters" ? "adapters" : undefined,
        );
        const details = [
            result.code
                ? (explanations[String(result.code)] ??
                  conciseText(result.code))
                : undefined,
            data?.version ? `version ${conciseText(data.version)}.` : undefined,
            data?.unchanged
                ? ({
                      already_enabled: "Already enabled.",
                      already_disabled: "Already disabled.",
                      up_to_date: "Up to date.",
                  }[String(data.reason)] ?? "Unchanged.")
                : undefined,
            !data?.unchanged && typeof data?.enabled === "boolean"
                ? data.enabled
                    ? "Enabled."
                    : "Disabled."
                : undefined,
            data && "channel" in data
                ? `Channel: ${data.channel ?? "managed by host"}.`
                : undefined,
            Array.isArray(raw?.data)
                ? `Channels: ${
                      raw.data.length
                          ? raw.data
                                .slice(0, 10)
                                .map((choice) => conciseText(choice, 60))
                                .join(", ") +
                            (raw.data.length > 10
                                ? ", … (use -v for all channels)"
                                : "")
                          : "none (managed by host)"
                  }.`
                : undefined,
            data?.restartRequired
                ? "Restart Cognis to activate the upgrade."
                : undefined,
        ].filter(Boolean);
        return `${conciseText(identity)}: ${conciseText(result.status)}${details.length ? ` — ${details.join(" ")}` : ""}`;
    });
    const counts = ["succeeded", "skipped", "failed"]
        .map(
            (status) =>
                `${results.filter((entry) => entry.status === status).length} ${status}`,
        )
        .join(", ");
    return [...lines, counts].join("\n");
}
