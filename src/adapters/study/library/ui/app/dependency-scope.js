import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

export function incompatibleDependencies(input, destination, entries) {
    const references = [
        ...(input.references ?? []),
        ...Object.values(input.referenceGroups ?? {}).flat(2),
    ];
    const ids = new Set(references.map(({ entryId }) => entryId));
    return entries.filter(
        (entry) =>
            ids.has(entry.id) &&
            destination.scope !== "user" &&
            entry.scope !== "global" &&
            !(
                destination.scope === "class" &&
                entry.scope === "class" &&
                entry.scopeId === destination.scopeId
            ),
    );
}

export async function resolveCreationScope(input, destination, entries, i18n) {
    const dependencies = incompatibleDependencies(input, destination, entries);
    if (!dependencies.length) return destination;
    const result = await openPopup({
        title: i18n.t("gateway.study.library_dependency_scope_title"),
        body: `<p>${escapeHtml(i18n.t("gateway.study.library_dependency_scope_help"))}</p><ul>${dependencies.map(({ label }) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`,
        actions: [
            {
                id: "personal",
                label: i18n.t("gateway.study.library_save_personal"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
    });
    return result === "personal" ? { scope: "user" } : null;
}

export function publishableDependencyLeaves(input, destination, entries) {
    const pending = incompatibleDependencies(input, destination, entries);
    const required = new Map();
    while (pending.length) {
        const entry = pending.pop();
        if (required.has(entry.id)) continue;
        required.set(entry.id, entry);
        pending.push(...incompatibleDependencies(entry, destination, entries));
    }
    return Array.from(required.values()).filter(
        (entry) =>
            entry.scope === "user" &&
            !entry.protected &&
            !incompatibleDependencies(entry, destination, entries).length,
    );
}
