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

export function findSelectedSnapshot(classroomSnapshots, selectedClassId) {
    return (
        classroomSnapshots.find(
            (snapshot) => snapshot.id === selectedClassId,
        ) ?? null
    );
}

export function syncTileLayoutFromSnapshot({
    snapshot,
    normalizeTileLayout,
    setTileLayout,
}) {
    const viewLayout = snapshot?.classroom?.viewLayout;
    if (viewLayout) {
        setTileLayout(normalizeTileLayout(viewLayout));
    }
}

export function applyClassroomSnapshotPatch(
    classroomSnapshots,
    classId,
    patch,
) {
    return classroomSnapshots.map((snapshot) => {
        if (snapshot.id !== classId) return snapshot;
        return {
            ...snapshot,
            classroom: {
                ...snapshot.classroom,
                ...patch,
            },
        };
    });
}

export function getNormalizedBoardFocus(snapshot, normalizeBoardFocus) {
    const rawBoardFocus = String(snapshot?.classroom?.boardFocus ?? "").trim();
    return rawBoardFocus ? normalizeBoardFocus(rawBoardFocus) : null;
}

export function resolvePreviousPath() {
    const referrerUrl = document.referrer
        ? new URL(document.referrer, window.location.origin)
        : null;
    return referrerUrl?.origin === window.location.origin &&
        referrerUrl?.pathname !== window.location.pathname
        ? referrerUrl.pathname + referrerUrl.search
        : "/";
}

export async function refreshClassroomRoleIfNeeded({
    canToggleClassroomView,
    apiFetch,
    applyClassroomViewModeFromUrl,
}) {
    if (canToggleClassroomView()) {
        return;
    }
    try {
        const accountId = localStorage.getItem("cognis_account");
        if (!accountId) {
            return;
        }
        const infoResponse = await apiFetch(
            `/api/v1/users/${encodeURIComponent(accountId)}/info`,
        );
        if (!infoResponse.ok) {
            return;
        }
        const infoPayload = await infoResponse.json();
        const refreshedRole = String(infoPayload?.data?.role ?? "").trim();
        if (!refreshedRole) {
            return;
        }
        localStorage.setItem("cognis_role", refreshedRole);
        applyClassroomViewModeFromUrl();
    } catch {
        // Keep existing role when refresh fails.
    }
}

export function applyPresenceToSnapshots(
    classroomSnapshots,
    presenceByAccountId,
) {
    return classroomSnapshots.map((snapshot) => ({
        ...snapshot,
        members: Array.isArray(snapshot?.members)
            ? snapshot.members.map((member) => {
                  const accountId = String(
                      member?.studentAccountId ?? "",
                  ).trim();
                  return {
                      ...member,
                      presence:
                          presenceByAccountId.get(accountId) ??
                          member?.presence ??
                          "offline",
                  };
              })
            : [],
    }));
}
