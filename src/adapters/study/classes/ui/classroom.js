import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { openSearchPopup } from "/static/reuse/search-bar.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
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
    let requireTeacherManualApproval = true;
    const presenceByAccountId = new Map();

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
            mode: isTeacherView() ? "teacher" : "student",
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

    function renderContentMarkup() {
        return renderClassroomPage({
            snapshot: selectedSnapshot(),
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
        });
    }

    function refreshDom() {
        const content = root.querySelector(".classes-classroom-content");
        if (content instanceof HTMLElement) {
            content.outerHTML = renderContentMarkup();
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
                            const seatButton = event.target.closest(
                                ".classes-classroom-seat",
                            );
                            if (seatButton instanceof HTMLElement) {
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
                                    ".classes-toggle-view-btn",
                                ) &&
                                teacherAccount
                            ) {
                                const nextMode =
                                    getClassroomViewMode() === "teacher"
                                        ? "student"
                                        : "teacher";
                                setClassroomViewMode(nextMode);
                                navigateTo(
                                    `${window.location.pathname}?classroomView=${encodeURIComponent(nextMode)}`,
                                );
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
                            }
                        },
                        { signal },
                    );

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
}

await mountWhenDirect(mount);
