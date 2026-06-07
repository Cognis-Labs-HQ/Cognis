import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    fetchProfileAvatarBlobUrl,
    handleProfileAvatarError,
    hydrateProfileAvatars,
} from "/static/gateways/social/reuse/profile-avatar.js";
import {
    loadFooterClasses,
    createClassFooterItem,
} from "/static/adapters/study/classes/study-footer.js";
import {
    applyClassroomViewModeFromUrl,
    canToggleClassroomView,
    getClassroomViewMode,
    setClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
import {
    buildAccountLabel,
    renderClassroomPage,
} from "/static/adapters/study/classes/classroom-render.js";
import { handleClassroomExit } from "/static/adapters/study/classes/classroom-exit.js";
import { createClassroomPresenceController } from "/static/adapters/study/classes/classroom-presence.js";
import { openCreateClassPopup } from "/static/adapters/study/classes/classroom-create-class-popup.js";
import { bindClassroomEnhancements } from "/static/adapters/study/classes/classroom-enhancements.js";

function buildQuery(params) {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value == null || value === "") continue;
        query.set(key, String(value));
    }
    return query.toString();
}

export async function mount(root, { signal } = {}) {
    applyClassroomViewModeFromUrl();
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.classroom_page_title");

    const teacherAccount = canToggleClassroomView();
    const query = new URL(window.location.href).searchParams;

    let classroomSnapshots = [];
    let availableClasses = [];
    let footerClasses = [];
    let selectedClassId = String(query.get("classId") ?? "").trim();
    let selectedSeatNumber = null;
    let selectedNotebookText = "";
    let classResources = { materials: "", homework: "" };
    let activeAgendaItems = [];
    let selectedLanguageFilter = "";
    let searchQuery = "";
    let activeBoardPanel = "agenda";
    let requireTeacherManualApproval = true;
    const presenceByAccountId = new Map();
    const boardEntitiesByClassId = new Map();

    function isTeacherView() {
        return teacherAccount && getClassroomViewMode() === "teacher";
    }

    function selectedSnapshot() {
        return (
            classroomSnapshots.find(
                (snapshot) => snapshot.id === selectedClassId,
            ) ?? null
        );
    }

    function getBoardEntities(snapshot) {
        const classId = String(snapshot?.id ?? "").trim();
        if (!classId) return [];
        return boardEntitiesByClassId.get(classId) ?? [];
    }

    function setBoardEntity(classId, kind, x, y) {
        const normalizedClassId = String(classId ?? "").trim();
        const normalizedKind =
            String(kind ?? "")
                .trim()
                .toLowerCase() === "meeting"
                ? "meeting"
                : "chat";
        if (!normalizedClassId) return;
        const boundedX = Math.min(Math.max(Number(x) || 0, 0), 1);
        const boundedY = Math.min(Math.max(Number(y) || 0, 0), 1);
        const current = boardEntitiesByClassId.get(normalizedClassId) ?? [];
        const next = current.filter((entry) => entry.kind !== normalizedKind);
        next.push({ kind: normalizedKind, x: boundedX, y: boundedY });
        boardEntitiesByClassId.set(normalizedClassId, next);
    }

    async function loadTeacherApplicationPolicy() {
        try {
            const response = await apiFetch("/api/v1/system/security");
            if (!response.ok) return;
            const payload = await response.json();
            requireTeacherManualApproval =
                payload?.data?.requireTeacherManualApproval !== false;
        } catch {
            requireTeacherManualApproval = true;
        }
    }

    async function loadClassrooms() {
        const queryString = buildQuery({
            student: teacherAccount && !isTeacherView() ? "true" : "",
        });
        const response = await apiFetch(
            `/api/v1/study/classrooms?${queryString}`,
        );
        if (!response.ok) {
            throw new Error("load_failed");
        }
        const payload = await response.json();
        classroomSnapshots = Array.isArray(payload?.data) ? payload.data : [];
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
        if (
            !selectedClassId ||
            !classroomSnapshots.some(
                (snapshot) => snapshot.id === selectedClassId,
            )
        ) {
            selectedClassId = String(classroomSnapshots[0]?.id ?? "");
            selectedSeatNumber = null;
        }
    }

    async function loadAvailableClasses() {
        if (isTeacherView()) {
            availableClasses = [];
            return;
        }
        const queryString = buildQuery({
            language: selectedLanguageFilter,
            search: searchQuery,
        });
        const response = await apiFetch(
            `/api/v1/study/available-classes${queryString ? `?${queryString}` : ""}`,
        );
        if (!response.ok) {
            availableClasses = [];
            return;
        }
        const payload = await response.json();
        availableClasses = Array.isArray(payload?.data) ? payload.data : [];
    }

    async function loadSelectedClassMeta() {
        const snapshot = selectedSnapshot();
        if (!snapshot) {
            selectedNotebookText = "";
            classResources = { materials: "", homework: "" };
            activeAgendaItems = [];
            return;
        }
        const [resourcesResponse, notebookResponse, agendaResponse] =
            await Promise.all([
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                ),
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
                ),
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/agenda`,
                ),
            ]);
        classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ?? {
                  materials: "",
                  homework: "",
              })
            : { materials: "", homework: "" };
        selectedNotebookText = notebookResponse.ok
            ? String((await notebookResponse.json())?.data?.noteText ?? "")
            : "";
        activeAgendaItems = agendaResponse.ok
            ? ((await agendaResponse.json())?.data?.activeItems ?? [])
            : [];
    }

    async function refreshData() {
        await Promise.all([
            loadClassrooms(),
            loadAvailableClasses(),
            loadTeacherApplicationPolicy(),
        ]);
        await loadSelectedClassMeta();
    }

    async function createClass() {
        const payload = await openCreateClassPopup({
            i18n,
            apiFetch,
            openPopup,
            requireTeacherManualApproval,
        });
        if (!payload?.languageCode) return;
        const response = await apiFetch("/api/v1/study/teacher-requests", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
        });
        if (response.status === 409) {
            showToast(i18n.t("module.study.classes.duplicate_language_class"), {
                variant: "error",
            });
            return;
        }
        if (!response.ok) {
            showToast(i18n.t("module.study.classes.request_failed"), {
                variant: "error",
            });
            return;
        }
        showToast(
            i18n.t(
                requireTeacherManualApproval
                    ? "module.study.classes.request_sent"
                    : "module.study.classes.class_created",
            ),
            { variant: "success" },
        );
        await refreshContent();
    }

    /** Creates or reuses a classroom meeting and navigates to it on success. */
    async function openMeeting(snapshot) {
        const response = await apiFetch(
            "/api/v1/modules/jitsi-meet/meetings/create",
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ classroomId: snapshot.id }),
            },
        );
        if (!response.ok) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json();
        const meetingId = String(payload?.data?.id ?? "").trim();
        if (!meetingId) {
            showToast(i18n.t("module.study.classes.meeting_failed"), {
                variant: "error",
            });
            return;
        }
        navigateTo(`/meetings?meetingId=${encodeURIComponent(meetingId)}`);
    }

    async function openSeatActionMenu(button) {
        const studentId = String(button.dataset.studentId ?? "").trim();
        const studentHandle = String(button.dataset.studentHandle ?? "").trim();
        if (!studentId) {
            openSearchPopup({
                endpoint: "/api/v1/social/messages/users/lookup",
                category: "user",
                ariaLabel: i18n.t("module.study.classes.invite_student"),
                noResultsText: i18n.t("ui.layout.search.no_results"),
                onSelect: async (result) => {
                    const accountId = String(result?.accountId ?? "").trim();
                    if (!accountId || !selectedClassId) return;
                    const response = await apiFetch(
                        `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/invite`,
                        {
                            method: "POST",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ accountId }),
                        },
                    );
                    showToast(
                        i18n.t(
                            response.ok
                                ? "module.study.classes.invite_success"
                                : "module.study.classes.invite_failed",
                        ),
                        { variant: response.ok ? "success" : "error" },
                    );
                    if (response.ok) {
                        await refreshContent();
                    }
                },
            });
            return;
        }
        const action = await openPopup({
            title: buildAccountLabel({
                studentAccountId: studentId,
                handle: studentHandle,
            }),
            body: `<p>${escapeHtml(i18n.t("module.study.classes.manage_student_prompt"))}</p>`,
            variant: "confirm",
            actions: [
                {
                    id: "message",
                    label: i18n.t("ui.reuse.message"),
                    variant: "confirm",
                },
                {
                    id: "kick",
                    label: i18n.t("module.study.classes.kick_student"),
                    variant: "cancel",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.close"),
                    variant: "cancel",
                },
            ],
        });
        if (action === "message" && studentHandle) {
            const response = await apiFetch("/api/v1/social/messages/rooms", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ handles: [studentHandle] }),
            });
            if (!response.ok) {
                showToast(i18n.t("module.study.classes.message_failed"), {
                    variant: "error",
                });
                return;
            }
            const payload = await response.json();
            navigateTo(
                `/messages/${encodeURIComponent(payload?.data?.id ?? "")}`,
            );
            return;
        }
        if (action === "kick" && selectedClassId) {
            const response = await apiFetch(
                `/api/v1/study/classrooms/${encodeURIComponent(selectedClassId)}/students/${encodeURIComponent(studentId)}`,
                { method: "DELETE" },
            );
            showToast(
                i18n.t(
                    response.ok
                        ? "module.study.classes.kick_success"
                        : "module.study.classes.kick_failed",
                ),
                { variant: response.ok ? "success" : "error" },
            );
            if (response.ok) {
                await refreshContent();
            }
        }
    }

    async function openAgendaPopup() {
        let title = "";
        let description = "";
        let startAt = "";
        let endAt = "";
        const action = await openPopup({
            title: i18n.t("module.study.classes.create_agenda"),
            body: `
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.agenda_title"))}
                    <input id="classes-agenda-title" class="theme-select" type="text" />
                </label>
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.agenda_description"))}
                    <textarea id="classes-agenda-description" class="theme-select" rows="4"></textarea>
                </label>
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.agenda_start"))}
                    <input id="classes-agenda-start" class="theme-select" type="datetime-local" />
                </label>
                <label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.agenda_end"))}
                    <input id="classes-agenda-end" class="theme-select" type="datetime-local" />
                </label>
            `,
            variant: "confirm",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "save",
                    label: i18n.t("module.study.classes.create_agenda"),
                    variant: "confirm",
                },
            ],
            closeProtection: true,
            onAction: (actionId, overlay) => {
                if (actionId !== "save") return true;
                title = String(
                    overlay.querySelector("#classes-agenda-title")?.value ?? "",
                ).trim();
                description = String(
                    overlay.querySelector("#classes-agenda-description")
                        ?.value ?? "",
                ).trim();
                startAt = String(
                    overlay.querySelector("#classes-agenda-start")?.value ?? "",
                ).trim();
                endAt = String(
                    overlay.querySelector("#classes-agenda-end")?.value ?? "",
                ).trim();
                return Boolean(title && startAt && endAt);
            },
        });
        if (action !== "save" || !selectedClassId) return;
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda`,
            {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title,
                    description,
                    startAt: new Date(startAt).toISOString(),
                    endAt: new Date(endAt).toISOString(),
                }),
            },
        );
        showToast(
            i18n.t(
                response.ok
                    ? "module.study.classes.agenda_saved"
                    : "module.study.classes.agenda_save_failed",
            ),
            { variant: response.ok ? "success" : "error" },
        );
        if (response.ok) {
            await loadSelectedClassMeta();
            refreshDom();
        }
    }

    async function openMemberProfilePreview(memberButton) {
        const handle = String(memberButton?.dataset?.studentHandle ?? "").trim();
        const fallbackName = String(
            memberButton?.dataset?.studentName ?? "",
        ).trim();
        const fallbackAvatarKey = String(
            memberButton?.dataset?.studentAvatarKey ?? "",
        ).trim();
        let profile = null;
        if (handle) {
            const profileResponse = await apiFetch(
                `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
            ).catch(() => null);
            if (profileResponse?.ok) {
                profile = (await profileResponse.json()).data ?? null;
            }
        }
        const displayName =
            String(profile?.displayName ?? "").trim() ||
            String(profile?.handle ?? "").trim() ||
            fallbackName ||
            i18n.t("module.study.classes.profile_unknown");
        const avatarKey =
            String(profile?.avatarKey ?? "").trim() || fallbackAvatarKey;
        const avatarBlobUrl = avatarKey
            ? await fetchProfileAvatarBlobUrl(avatarKey)
            : null;
        const bio = String(profile?.bio ?? "").trim();
        await openPopup({
            title: i18n.t("module.study.classes.profile_preview"),
            body: `
                <div class="stack">
                    <div style="display:flex;align-items:center;gap:12px;">
                        ${
                            avatarBlobUrl
                                ? `<img src="${escapeHtml(avatarBlobUrl)}" alt="" style="width:52px;height:52px;border-radius:999px;object-fit:cover;border:1px solid var(--border);" />`
                                : `<span style="width:52px;height:52px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-2);border:1px solid var(--border);font-weight:700;">${escapeHtml(displayName.slice(0, 2).toUpperCase())}</span>`
                        }
                        <div class="stack" style="gap:2px;">
                            <strong>${escapeHtml(displayName)}</strong>
                            ${
                                handle
                                    ? `<span style="color:var(--text-muted);">@${escapeHtml(handle)}</span>`
                                    : ""
                            }
                        </div>
                    </div>
                    ${
                        bio
                            ? `<p style="margin:0;color:var(--text-muted);">${escapeHtml(bio)}</p>`
                            : ""
                    }
                </div>
            `,
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.close"),
                    variant: "confirm",
                },
            ],
        });
    }

    async function openClassSettingsPopup(snapshot) {
        if (!snapshot) return;
        const rawLimit = Number(snapshot?.classroom?.studentLimit);
        const currentLimit =
            Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 20;
        const currentName = String(snapshot?.name ?? "").trim();
        const formBuilder = createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "classes-settings-form",
                includeSubmitButton: false,
                submitLabelKey: "ui.reuse.save",
                fields: [
                    {
                        name: "className",
                        labelKey: "module.study.classes.class_name_label",
                        type: "text",
                        required: true,
                        value: currentName,
                        attributes: { maxlength: 120 },
                    },
                    {
                        name: "studentLimit",
                        labelKey: "module.study.classes.class_cap_label",
                        type: "number",
                        required: true,
                        value: String(currentLimit),
                        attributes: { min: 1, max: 100, step: 1 },
                    },
                ],
            },
        );
        let controller = null;
        let nextClassName = currentName;
        let nextStudentLimit = currentLimit;
        const action = await openPopup({
            title: i18n.t("module.study.classes.class_settings"),
            body: formBuilder.render(),
            variant: "confirm",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
            ],
            closeProtection: true,
            onOpen: (overlay) => {
                const form = overlay.querySelector("#classes-settings-form");
                controller =
                    form instanceof HTMLFormElement
                        ? formBuilder.attach(form)
                        : null;
            },
            onAction: (actionId) => {
                if (actionId !== "save") return true;
                if (!controller?.validateAll(true)) return false;
                const values = controller.getValues();
                nextClassName = String(values.className ?? "").trim();
                const parsedLimit = Number(values.studentLimit ?? "");
                nextStudentLimit =
                    Number.isInteger(parsedLimit) &&
                    parsedLimit >= 1 &&
                    parsedLimit <= 100
                        ? parsedLimit
                        : currentLimit;
                return Boolean(nextClassName);
            },
        });
        if (action !== "save") return;
        const updates = [];
        if (nextClassName !== currentName) {
            updates.push(
                apiFetch(`/api/v1/study/classes/${encodeURIComponent(snapshot.id)}`, {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name: nextClassName }),
                }),
            );
        }
        if (nextStudentLimit !== currentLimit) {
            updates.push(
                apiFetch(
                    `/api/v1/study/classrooms/${encodeURIComponent(snapshot.id)}/layout`,
                    {
                        method: "PATCH",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ studentLimit: nextStudentLimit }),
                    },
                ),
            );
        }
        if (!updates.length) return;
        const responses = await Promise.all(updates);
        const success = responses.every((response) => response.ok);
        showToast(
            i18n.t(
                success
                    ? "module.study.classes.class_settings_saved"
                    : "module.study.classes.class_settings_failed",
            ),
            { variant: success ? "success" : "error" },
        );
        if (success) {
            await refreshContent();
        }
    }

    function renderContentMarkup() {
        const snapshot = selectedSnapshot();
        return renderClassroomPage({
            snapshot,
            classResources,
            activeAgendaItems,
            selectedSeatNumber,
            selectedNotebookText,
            i18n,
            isTeacherView: isTeacherView(),
            availableClasses,
            selectedLanguageFilter,
            searchQuery,
            canToggleView: teacherAccount,
            currentViewMode: getClassroomViewMode(),
            canEditMaterials: teacherAccount,
            boardEntities: getBoardEntities(snapshot),
            activeBoardPanel,
        });
    }

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            content.outerHTML = renderContentMarkup();
            void hydrateProfileAvatars(root);
        }
    }

    async function refreshContent() {
        await refreshData();
        refreshSnapshotPresence();
        footerClasses = await loadFooterClasses();
        refreshDom();
        composer.refreshFooter();
    }

    function refreshSnapshotPresence() {
        classroomSnapshots = classroomSnapshots.map((snapshot) => ({
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

    footerClasses = await loadFooterClasses();
    await refreshData();
    refreshSnapshotPresence();
    const presenceController = createClassroomPresenceController({
        apiFetch,
        signal,
        onPresence: (accountId, status) => {
            presenceByAccountId.set(accountId, status);
            refreshSnapshotPresence();
            refreshDom();
        },
    });
    await presenceController.init();

    const footerItem = createClassFooterItem({
        i18n,
        signal,
        getClasses: () => footerClasses,
        getSelectedClassId: () => selectedClassId,
        allowCreateOption: isTeacherView(),
        onSelectClass: async (classId) => {
            selectedClassId = classId;
            selectedSeatNumber = null;
            activeBoardPanel = "agenda";
            await loadSelectedClassMeta();
            refreshDom();
        },
        onCreateClass: createClass,
    });

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "classroom-page",
                title: i18n.t("module.study.classes.classroom_page_title"),
                gridSize: { default: [8, 6], min: [2, 2], max: "full" },
                render: renderContentMarkup,
                onRender() {
                    if (root.dataset.classroomBound === "true") return;
                    root.dataset.classroomBound = "true";
                    root.addEventListener(
                        "click",
                        async (event) => {
                            if (!(event.target instanceof Element)) return;
                            const snapshot = selectedSnapshot();
                            const profileButton = event.target.closest(
                                ".classes-member-profile-btn",
                            );
                            if (profileButton instanceof HTMLElement) {
                                await openMemberProfilePreview(profileButton);
                                return;
                            }

                            const boardPanelButton = event.target.closest(
                                ".classes-board-panel-btn[data-board-panel]",
                            );
                            if (boardPanelButton instanceof HTMLElement) {
                                activeBoardPanel =
                                    boardPanelButton.dataset.boardPanel ===
                                    "classroom"
                                        ? "classroom"
                                        : "agenda";
                                refreshDom();
                                return;
                            }

                            const seatButton =
                                event.target.closest(".classes-desk-unit");
                            if (seatButton instanceof HTMLElement) {
                                if (
                                    !Number.isInteger(
                                        Number(
                                            seatButton.dataset.seatNumber ?? "",
                                        ),
                                    )
                                ) {
                                    return;
                                }
                                selectedSeatNumber = Number(
                                    seatButton.dataset.seatNumber ?? "-1",
                                );
                                if (isTeacherView()) {
                                    await openSeatActionMenu(seatButton);
                                } else {
                                    refreshDom();
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-chat-btn",
                                ) &&
                                snapshot?.chatUrl
                            ) {
                                navigateTo(snapshot.chatUrl);
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-meeting-btn",
                                ) &&
                                snapshot
                            ) {
                                await openMeeting(snapshot);
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-create-agenda-btn",
                                )
                            ) {
                                await openAgendaPopup();
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-class-settings-btn",
                                )
                            ) {
                                await openClassSettingsPopup(snapshot);
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-toggle-view-btn",
                                ) &&
                                teacherAccount
                            ) {
                                const nextMode =
                                    getClassroomViewMode() === "teacher"
                                        ? "student"
                                        : "teacher";
                                setClassroomViewMode(nextMode);
                                const nextUrl = new URL(
                                    window.location.href,
                                    window.location.origin,
                                );
                                if (nextMode === "student") {
                                    nextUrl.searchParams.set("student", "true");
                                } else {
                                    nextUrl.searchParams.delete("student");
                                }
                                navigateTo(nextUrl.pathname + nextUrl.search);
                                return;
                            }

                            const quickApproveButton = event.target.closest(
                                ".classes-quick-approve-btn",
                            );
                            if (
                                quickApproveButton instanceof HTMLElement &&
                                selectedClassId
                            ) {
                                const studentId = String(
                                    quickApproveButton.dataset.studentId ?? "",
                                ).trim();
                                if (!studentId) return;
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/join-requests/${encodeURIComponent(studentId)}/approve`,
                                    { method: "POST" },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.request_approved"
                                            : "module.study.classes.request_review_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    await refreshContent();
                                }
                                return;
                            }

                            if (event.target.closest("#study-classroom-door")) {
                                await handleClassroomExit({
                                    snapshot,
                                    isTeacherView: isTeacherView(),
                                    i18n,
                                    openPopup,
                                    apiFetch,
                                    showToast,
                                    onSuccess: async (kind) => {
                                        if (kind === "disband") {
                                            selectedClassId = "";
                                            selectedSeatNumber = null;
                                        }
                                        await refreshContent();
                                    },
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-save-materials-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const materialsInput =
                                    root.querySelector("#classes-materials");
                                const homeworkInput =
                                    root.querySelector("#classes-homework");
                                if (
                                    !(
                                        materialsInput instanceof
                                        HTMLTextAreaElement
                                    ) ||
                                    !(
                                        homeworkInput instanceof
                                        HTMLTextAreaElement
                                    )
                                ) {
                                    return;
                                }
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            materials:
                                                materialsInput.value ?? "",
                                            homework: homeworkInput.value ?? "",
                                        }),
                                    },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.materials_saved"
                                            : "module.study.classes.materials_save_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    await loadSelectedClassMeta();
                                    refreshDom();
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-save-notebook-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const notebookInput = root.querySelector(
                                    "#classes-own-notebook",
                                );
                                if (
                                    !(
                                        notebookInput instanceof
                                        HTMLTextAreaElement
                                    )
                                ) {
                                    return;
                                }
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
                                    {
                                        method: "PUT",
                                        headers: {
                                            "content-type": "application/json",
                                        },
                                        body: JSON.stringify({
                                            noteText: notebookInput.value ?? "",
                                        }),
                                    },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.notebook_saved"
                                            : "module.study.classes.notebook_save_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    selectedNotebookText =
                                        notebookInput.value ?? "";
                                }
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-notebook-btn",
                                )
                            ) {
                                if (!snapshot) return;
                                const studentId = String(
                                    event.target.closest(
                                        ".classes-open-notebook-btn",
                                    )?.dataset?.studentId ?? "",
                                ).trim();
                                if (!studentId) return;
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebooks/${encodeURIComponent(studentId)}`,
                                );
                                if (!response.ok) {
                                    showToast(
                                        i18n.t(
                                            "module.study.classes.notebook_load_failed",
                                        ),
                                        {
                                            variant: "error",
                                        },
                                    );
                                    return;
                                }
                                const payload = await response.json();
                                await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.open_notebook",
                                    ),
                                    body: `<p>${escapeHtml(payload?.data?.noteText || i18n.t("module.study.classes.empty_notebook"))}</p>`,
                                    actions: [
                                        {
                                            id: "close",
                                            label: i18n.t("ui.reuse.close"),
                                            variant: "confirm",
                                        },
                                    ],
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-open-homework-btn",
                                )
                            ) {
                                await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.open_textbook",
                                    ),
                                    body: `<p>${escapeHtml(classResources.homework || i18n.t("module.study.classes.no_homework_assigned"))}</p>`,
                                    actions: [
                                        {
                                            id: "close",
                                            label: i18n.t("ui.reuse.close"),
                                            variant: "confirm",
                                        },
                                    ],
                                });
                                return;
                            }

                            if (
                                event.target.closest(
                                    ".classes-leave-classroom-btn",
                                )
                            ) {
                                await handleClassroomExit({
                                    snapshot,
                                    isTeacherView: false,
                                    i18n,
                                    openPopup,
                                    apiFetch,
                                    showToast,
                                    onSuccess: async () => {
                                        await refreshContent();
                                    },
                                });
                                return;
                            }

                            const joinButton =
                                event.target.closest(".classes-join-btn");
                            if (joinButton instanceof HTMLElement) {
                                const classId =
                                    joinButton.dataset.classId ?? "";
                                const response = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(classId)}/join`,
                                    { method: "POST" },
                                );
                                showToast(
                                    i18n.t(
                                        response.ok
                                            ? "module.study.classes.join_sent"
                                            : "module.study.classes.join_failed",
                                    ),
                                    {
                                        variant: response.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                if (response.ok) {
                                    await refreshContent();
                                }
                                return;
                            }

                            const filterButton =
                                event.target.closest("[data-language]");
                            if (filterButton instanceof HTMLElement) {
                                selectedLanguageFilter =
                                    filterButton.dataset.language ?? "";
                                await loadAvailableClasses();
                                refreshDom();
                                return;
                            }

                        },
                        { signal },
                    );
                    root.addEventListener("error", handleProfileAvatarError, {
                        signal,
                        capture: true,
                    });

                    root.addEventListener(
                        "input",
                        async (event) => {
                            if (
                                !(event.target instanceof HTMLInputElement) ||
                                !event.target.classList.contains(
                                    "classes-available-search",
                                )
                            ) {
                                return;
                            }
                            searchQuery = event.target.value.trim();
                            await loadAvailableClasses();
                            refreshDom();
                        },
                        { signal },
                    );
                    bindClassroomEnhancements({
                        root,
                        signal,
                        apiFetch,
                        i18n,
                        showToast,
                        selectedSnapshot,
                        setBoardEntity,
                        refreshDom,
                        refreshContent,
                    });
                },
            },
        ],
        preferenceKey: "classes-classroom-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.classroom_page_title"),
            subtitle: i18n.t("module.study.classes.classroom_page_subtitle"),
        },
        footer: [footerItem],
    });
    await composer.init();
    void hydrateProfileAvatars(root);
}

await mountWhenDirect(mount);
