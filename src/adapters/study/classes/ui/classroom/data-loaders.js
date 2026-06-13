export function createClassroomDataLoaders({
    apiFetch,
    buildQuery,
    isTeacherView,
    getSelectedLanguageFilter,
    getSearchQuery,
    getIsClassSearchDetached,
    getPresenceByAccountId,
    getSelectedClassId,
    setSelectedClassId,
    setSelectedSeatNumber,
    setClassroomSnapshots,
    syncWorkspaceModeWithSnapshot,
}) {
    async function loadClassrooms() {
        const response = await apiFetch(`/api/v1/study/classrooms`);
        if (!response.ok) {
            throw new Error("load_failed");
        }
        const payload = await response.json();
        const classroomSnapshots = Array.isArray(payload?.data)
            ? payload.data
            : [];
        setClassroomSnapshots(classroomSnapshots);
        const presenceByAccountId = getPresenceByAccountId();
        for (const snapshot of classroomSnapshots) {
            const members = Array.isArray(snapshot?.members)
                ? snapshot.members
                : [];
            for (const member of members) {
                const accountId = String(member?.studentAccountId ?? "").trim();
                const presence = String(member?.presence ?? "").trim();
                if (!accountId || !presence) continue;
                presenceByAccountId.set(accountId, presence);
            }
        }
        const selectedClassId = getSelectedClassId();
        if (
            !selectedClassId ||
            !classroomSnapshots.some(
                (snapshot) => snapshot.id === selectedClassId,
            )
        ) {
            if (!getIsClassSearchDetached()) {
                setSelectedClassId(String(classroomSnapshots[0]?.id ?? ""));
                setSelectedSeatNumber(null);
            }
        }
        syncWorkspaceModeWithSnapshot({ force: true });
    }

    async function loadAvailableClasses() {
        if (isTeacherView()) {
            return [];
        }
        const queryString = buildQuery({
            language: getSelectedLanguageFilter(),
            search: getSearchQuery(),
        });
        const response = await apiFetch(
            `/api/v1/study/available-classes${queryString ? `?${queryString}` : ""}`,
        );
        if (!response.ok) {
            return [];
        }
        const payload = await response.json();
        return Array.isArray(payload?.data) ? payload.data : [];
    }

    return {
        loadClassrooms,
        loadAvailableClasses,
    };
}
