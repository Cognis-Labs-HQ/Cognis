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

export function moveTileToStackEnd(tileOrder, tileMode) {
    const normalizedOrder = Array.isArray(tileOrder) ? [...tileOrder] : [];
    const tileIndex = normalizedOrder.indexOf(tileMode);
    const lastIndex = normalizedOrder.length - 1;
    if (tileIndex < 0 || tileIndex === lastIndex) {
        return normalizedOrder;
    }
    normalizedOrder[tileIndex] = normalizedOrder[lastIndex];
    normalizedOrder[lastIndex] = tileMode;
    return normalizedOrder;
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

/**
 * Resolves the active meeting ID for a classroom snapshot from the Jitsi-Meet
 * active-meetings API response. Returns the meeting ID string when the teacher
 * is an active participant, or null otherwise.
 *
 * @param {{ data: object[] } | null} activeMeetingPayload
 * @param {{ id: string, teacherAccountId?: string }} snapshot
 * @returns {string | null}
 */
export function resolveActiveMeetingId(activeMeetingPayload, snapshot) {
    const activeMeetings = Array.isArray(activeMeetingPayload?.data)
        ? activeMeetingPayload.data
        : [];
    const activeMeeting = activeMeetings.find((meeting) => {
        const meetingClassroomId = String(
            meeting?.classroomId ??
                meeting?.classId ??
                meeting?.classroom?.id ??
                "",
        ).trim();
        return meetingClassroomId === snapshot.id;
    });
    if (!activeMeeting) return null;
    const teacherAccountId = String(snapshot?.teacherAccountId ?? "").trim();
    const activeParticipants = Array.isArray(activeMeeting?.activeParticipants)
        ? activeMeeting.activeParticipants
        : [];
    // Active meeting participant payloads can expose either username or
    // handle, while classroom snapshots only expose teacherAccountId.
    const teacherActiveInMeeting = Boolean(
        teacherAccountId &&
        activeParticipants.some((participant) => {
            const username = String(participant?.username ?? "").trim();
            const handle = String(participant?.handle ?? "").trim();
            return username === teacherAccountId || handle === teacherAccountId;
        }),
    );
    return teacherActiveInMeeting
        ? String(activeMeeting?.id ?? "").trim() || null
        : null;
}
