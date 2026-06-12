export function buildQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
    }
    return query.toString();
}

export function normalizeWorkspaceMode(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (
        normalized === "notepad" ||
        normalized === "whiteboard" ||
        normalized === "meeting" ||
        normalized === "chat"
    ) {
        return normalized;
    }
    return "agenda";
}

export function normalizeSidebarMode(input) {
    const normalized = String(input ?? "")
        .trim()
        .toLowerCase();
    if (normalized === "students" || normalized === "agenda") {
        return normalized;
    }
    return "materials";
}

export function createDefaultClassResources() {
    return {
        materials: "",
        homework: "",
        files: [],
        agendaDocument: "",
        agendaSnapshots: [],
    };
}
