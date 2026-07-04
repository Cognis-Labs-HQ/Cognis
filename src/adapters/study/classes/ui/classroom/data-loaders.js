/**
 * Creates a loader that fetches and applies all class-level metadata for the
 * currently selected classroom: resources, notebook, agenda, whiteboards,
 * active meeting, and whiteboard embed token.
 *
 * @param {{ apiFetch: Function, getSnapshot: Function, isTeacherView: Function, getSelectedActiveWhiteboardId: Function, getSelectedActiveMaterialKey: Function, resolveActiveMeetingId: Function, createDefaultClassResources: Function, loadActiveMaterialPreview: Function, revokeActiveMaterialPreview: Function, syncStudentWorkspaceAccess: Function, pollTeacherViewState: Function, syncTileLayoutWithSnapshot: Function, addInitializedTile: Function, i18n: object, getSupportsWhiteboards: Function, getActiveWhiteboard: Function, setClassResources: Function, setSelectedNotebookText: Function, setAgendaDocument: Function, setAgendaSnapshots: Function, setWhiteboards: Function, setActiveWhiteboard: Function, setActiveMeetingId: Function, setActiveMaterialKey: Function, setLastBroadcastedMaterialKey: Function }} ctx
 * @returns {{ loadSelectedClassMeta: Function }}
 */
export function createClassMetaLoader({
    apiFetch,
    getSnapshot,
    isTeacherView,
    getSelectedActiveWhiteboardId,
    getSelectedActiveMaterialKey,
    resolveActiveMeetingId,
    createDefaultClassResources,
    loadActiveMaterialPreview,
    revokeActiveMaterialPreview,
    syncStudentWorkspaceAccess,
    pollTeacherViewState,
    syncTileLayoutWithSnapshot,
    addInitializedTile,
    i18n,
    getSupportsWhiteboards,
    getActiveWhiteboard,
    setClassResources,
    setSelectedNotebookText,
    setAgendaDocument,
    setAgendaSnapshots,
    setWhiteboards,
    setActiveWhiteboard,
    setActiveMeetingId,
    setActiveMaterialKey,
    setLastBroadcastedMaterialKey,
}) {
    async function loadSelectedClassMeta() {
        const jitsiActiveMeetingsUrl = String(
            document.querySelector(
                'meta[name="classroom-jitsi-active-meetings-url"]',
            )?.content ?? "",
        ).trim();
        const snapshot = getSnapshot();
        if (!snapshot) {
            setSelectedNotebookText("");
            setClassResources(createDefaultClassResources());
            setAgendaDocument("");
            setAgendaSnapshots([]);
            setWhiteboards([]);
            setActiveWhiteboard(null);
            setActiveMeetingId(null);
            setActiveMaterialKey(null);
            setLastBroadcastedMaterialKey(null);
            revokeActiveMaterialPreview();
            return;
        }
        syncTileLayoutWithSnapshot(snapshot);
        const selectedActiveWhiteboardId =
            getSelectedActiveWhiteboardId(snapshot);
        const supportsWhiteboards = getSupportsWhiteboards();
        const [
            resourcesResponse,
            notebookResponse,
            agendaResponse,
            whiteboardsResponse,
            activeMeetingResponse,
            studentWhiteboardTokenResponse,
        ] = await Promise.all([
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                { suppressConnectionRecoveryToast: true },
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
            ),
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notes/agenda`,
            ),
            supportsWhiteboards
                ? apiFetch(
                      `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards`,
                  )
                : Promise.resolve(null),
            jitsiActiveMeetingsUrl
                ? apiFetch(
                      `${jitsiActiveMeetingsUrl}?classroomId=${encodeURIComponent(snapshot.id)}`,
                  ).catch(() => null)
                : Promise.resolve(null),
            supportsWhiteboards &&
            !isTeacherView() &&
            selectedActiveWhiteboardId
                ? apiFetch(
                      `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/whiteboards/${encodeURIComponent(selectedActiveWhiteboardId)}/token`,
                      { suppressConnectionRecoveryToast: true },
                  ).catch(() => null)
                : Promise.resolve(null),
        ]);
        let classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ??
              createDefaultClassResources())
            : createDefaultClassResources();
        const notebookText = notebookResponse.ok
            ? String((await notebookResponse.json())?.data?.noteText ?? "")
            : "";
        const agendaPayload = agendaResponse.ok
            ? (await agendaResponse.json().catch(() => ({ data: null })))?.data
            : null;
        const agendaDocument = String(agendaPayload?.document ?? "");
        const agendaSnapshots = Array.isArray(agendaPayload?.snapshots)
            ? agendaPayload.snapshots
            : [];
        classResources = { ...classResources, agendaDocument, agendaSnapshots };
        const activeMeetingPayload = activeMeetingResponse?.ok
            ? await activeMeetingResponse.json().catch(() => ({ data: [] }))
            : { data: [] };
        const meetingId = resolveActiveMeetingId(
            activeMeetingPayload,
            snapshot,
        );
        let whiteboards = whiteboardsResponse?.ok
            ? ((await whiteboardsResponse.json())?.data ?? [])
            : [];
        if (!isTeacherView()) {
            whiteboards = selectedActiveWhiteboardId
                ? whiteboards.filter(
                      (board) =>
                          String(board?.id ?? "") ===
                          selectedActiveWhiteboardId,
                  )
                : [];
        }
        let activeWhiteboard = getActiveWhiteboard();
        if (activeWhiteboard) {
            const match = whiteboards.find(
                (board) => String(board?.id ?? "") === activeWhiteboard.boardId,
            );
            if (!match) {
                activeWhiteboard = null;
            } else {
                activeWhiteboard = {
                    ...activeWhiteboard,
                    boardName: String(
                        match?.name ?? activeWhiteboard.boardName,
                    ),
                };
            }
        }
        if (
            supportsWhiteboards &&
            !isTeacherView() &&
            activeWhiteboard?.boardId !== selectedActiveWhiteboardId
        ) {
            activeWhiteboard = null;
        }
        if (
            supportsWhiteboards &&
            !isTeacherView() &&
            selectedActiveWhiteboardId &&
            !activeWhiteboard?.embedUrl &&
            studentWhiteboardTokenResponse?.ok
        ) {
            const tokenPayload = await studentWhiteboardTokenResponse
                .json()
                .catch(() => ({ data: {} }));
            const embedUrl = String(tokenPayload?.data?.embedUrl ?? "").trim();
            if (embedUrl) {
                const matchBoard = whiteboards.find(
                    (board) =>
                        String(board?.id ?? "") === selectedActiveWhiteboardId,
                );
                activeWhiteboard = {
                    boardId: selectedActiveWhiteboardId,
                    boardName:
                        String(matchBoard?.name ?? "").trim() ||
                        i18n.t("module.study.classes.whiteboard"),
                    embedUrl,
                };
                addInitializedTile("whiteboard");
            }
        }
        const materialKey = getSelectedActiveMaterialKey(snapshot);
        setClassResources(classResources);
        setSelectedNotebookText(notebookText);
        setAgendaDocument(agendaDocument);
        setAgendaSnapshots(agendaSnapshots);
        setWhiteboards(whiteboards);
        setActiveWhiteboard(activeWhiteboard);
        setActiveMeetingId(meetingId);
        setActiveMaterialKey(materialKey);
        setLastBroadcastedMaterialKey(materialKey);
        await loadActiveMaterialPreview(materialKey, classResources.files);
        syncStudentWorkspaceAccess(snapshot);
        await pollTeacherViewState();
    }

    return { loadSelectedClassMeta };
}

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
