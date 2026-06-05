import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { isTeacherScope } from "/static/reuse/access-role.js";

const DEFAULT_CLASSROOM_CAPACITY = 30;

function normalizeSeatAssignments(rawSeatAssignments) {
    if (!rawSeatAssignments || typeof rawSeatAssignments !== "object")
        return {};
    const seatAssignments = {};
    for (const [accountId, seatNumber] of Object.entries(rawSeatAssignments)) {
        const normalizedSeatNumber = Number(seatNumber);
        if (
            !Number.isInteger(normalizedSeatNumber) ||
            normalizedSeatNumber < 0
        ) {
            continue;
        }
        seatAssignments[String(accountId)] = normalizedSeatNumber;
    }
    return seatAssignments;
}

function buildAccountAbbreviation(accountId) {
    const normalized = String(accountId ?? "").trim();
    if (!normalized) return "??";
    return normalized.slice(0, 2).toUpperCase();
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.classroom_page_title");

    const viewerAccountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();
    const isTeacher = isTeacherScope();

    let classroomSnapshots = [];
    let selectedClassId = "";
    let selectedSeatNumber = null;
    let selectedNotebookText = "";
    let classResources = { materials: "", homework: "" };
    let incomingRequests = [];

    function selectedSnapshot() {
        return (
            classroomSnapshots.find(
                (snapshot) => snapshot.id === selectedClassId,
            ) ?? null
        );
    }

    async function loadClassrooms() {
        const response = await apiFetch("/api/v1/study/classrooms");
        if (!response.ok) throw new Error("load_failed");
        const payload = await response.json();
        classroomSnapshots = Array.isArray(payload?.data) ? payload.data : [];
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

    async function loadClassMeta() {
        const snapshot = selectedSnapshot();
        if (!snapshot) {
            classResources = { materials: "", homework: "" };
            incomingRequests = [];
            selectedNotebookText = "";
            return;
        }
        const [resourcesResponse, ownNotebookResponse, requestsResponse] =
            await Promise.all([
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
                ),
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
                ),
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook-requests`,
                ),
            ]);
        classResources = resourcesResponse.ok
            ? ((await resourcesResponse.json())?.data ?? {
                  materials: "",
                  homework: "",
              })
            : { materials: "", homework: "" };
        selectedNotebookText = ownNotebookResponse.ok
            ? String((await ownNotebookResponse.json())?.data?.noteText ?? "")
            : "";
        incomingRequests = requestsResponse.ok
            ? ((await requestsResponse.json())?.data ?? [])
            : [];
    }

    function renderClassSelectOptions() {
        if (!classroomSnapshots.length) {
            return `<option value="">${escapeHtml(i18n.t("module.study.classes.no_enrolled_classes"))}</option>`;
        }
        return classroomSnapshots
            .map((snapshot) => {
                const selected =
                    snapshot.id === selectedClassId ? " selected" : "";
                return `<option value="${escapeHtml(snapshot.id)}"${selected}>${escapeHtml(snapshot.languageCode)} · ${escapeHtml(snapshot.id)}</option>`;
            })
            .join("");
    }

    function renderIncomingRequests() {
        if (!incomingRequests.length) return "";
        const rows = incomingRequests
            .map(
                (request) => `
            <li class="classes-member-item">
              <span>${escapeHtml(request.viewerStudentAccountId)}</span>
              <div class="classes-actions">
                <button type="button" class="btn-confirm btn-animated classes-note-review-btn" data-action="approve" data-viewer-id="${escapeHtml(request.viewerStudentAccountId)}">${escapeHtml(i18n.t("module.study.classes.approve"))}</button>
                <button type="button" class="btn-cancel btn-animated classes-note-review-btn" data-action="reject" data-viewer-id="${escapeHtml(request.viewerStudentAccountId)}">${escapeHtml(i18n.t("module.study.classes.reject"))}</button>
              </div>
            </li>
          `,
            )
            .join("");
        return `
          <div class="classes-manage-panel">
            <h4 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.note_requests"))}</h4>
            <ul class="classes-member-list">${rows}</ul>
          </div>
        `;
    }

    function renderClassroom() {
        const snapshot = selectedSnapshot();
        if (!snapshot) {
            return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_enrolled_classes"))}</p>`;
        }
        const studentLimit = Number(
            snapshot?.classroom?.studentLimit ?? DEFAULT_CLASSROOM_CAPACITY,
        );
        const normalizedStudentLimit =
            Number.isInteger(studentLimit) && studentLimit > 0
                ? studentLimit
                : DEFAULT_CLASSROOM_CAPACITY;
        const seatAssignments = normalizeSeatAssignments(
            snapshot?.classroom?.seatAssignments,
        );
        const members = Array.isArray(snapshot.members) ? snapshot.members : [];
        const studentBySeat = new Map();
        for (const member of members) {
            const studentAccountId = String(member.studentAccountId ?? "");
            const seatNumber = seatAssignments[studentAccountId];
            if (Number.isInteger(seatNumber) && seatNumber >= 0) {
                studentBySeat.set(seatNumber, studentAccountId);
            }
        }
        const seatTiles = Array.from({ length: normalizedStudentLimit })
            .map((_, seatNumber) => {
                const studentAccountId = studentBySeat.get(seatNumber) ?? "";
                const selectedClass =
                    Number(selectedSeatNumber) === seatNumber
                        ? " selected"
                        : "";
                const occupiedClass = studentAccountId ? " occupied" : "";
                return `
              <button
                type="button"
                class="classes-classroom-seat${selectedClass}${occupiedClass}"
                data-seat-number="${seatNumber}"
                data-student-id="${escapeHtml(studentAccountId)}"
              >
                <span class="classes-classroom-seat-icon">🪑</span>
                <span class="classes-classroom-seat-label">${escapeHtml(i18n.t("module.study.classes.classroom_seat"))} ${seatNumber + 1}</span>
                <span class="classes-classroom-seat-icon">🧑‍🎓</span>
                <span class="classes-classroom-seat-avatar">${studentAccountId ? escapeHtml(buildAccountAbbreviation(studentAccountId)) : "—"}</span>
                <span class="classes-classroom-seat-desk">🧾</span>
              </button>
            `;
            })
            .join("");

        const selectedStudentId =
            selectedSeatNumber == null
                ? ""
                : (studentBySeat.get(selectedSeatNumber) ?? "");
        const isOwnDesk = Boolean(
            selectedStudentId && selectedStudentId === viewerAccountId,
        );

        const deskPanel = selectedStudentId
            ? `
            <div class="classes-manage-panel">
              <h4 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.selected_desk"))}: ${escapeHtml(selectedStudentId)}</h4>
              <div class="classes-actions">
                <button type="button" class="btn-confirm btn-animated classes-open-notebook-btn" data-student-id="${escapeHtml(selectedStudentId)}">${escapeHtml(i18n.t("module.study.classes.open_notebook"))}</button>
                <button type="button" class="btn-confirm btn-animated classes-open-homework-btn">${escapeHtml(i18n.t("module.study.classes.open_textbook"))}</button>
              </div>
              ${
                  isOwnDesk
                      ? `
                <label class="classes-section-heading" for="classes-own-notebook">${escapeHtml(i18n.t("module.study.classes.my_notebook"))}</label>
                <textarea id="classes-own-notebook" class="classes-notebook-editor">${escapeHtml(selectedNotebookText)}</textarea>
                <button type="button" class="btn-confirm btn-animated classes-save-notebook-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
              `
                      : ""
              }
            </div>
          `
            : "";

        const teacherMaterialsActions = isTeacher
            ? `
          <button type="button" class="btn-confirm btn-animated classes-save-materials-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
        `
            : "";

        return `
          <div class="classes-classroom-board-area">
            <div class="classes-classroom-blackboard">
              <h4>${escapeHtml(i18n.t("module.study.classes.classroom_blackboard"))}</h4>
              <label class="classes-section-heading" for="classes-materials">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</label>
              <textarea id="classes-materials" class="classes-classroom-editor"${isTeacher ? "" : " readonly"}>${escapeHtml(classResources.materials ?? "")}</textarea>
              <label class="classes-section-heading" for="classes-homework">${escapeHtml(i18n.t("module.study.classes.assigned_homework"))}</label>
              <textarea id="classes-homework" class="classes-classroom-editor"${isTeacher ? "" : " readonly"}>${escapeHtml(classResources.homework ?? "")}</textarea>
              ${teacherMaterialsActions}
            </div>
            <div class="classes-classroom-teacher">
              <span class="classes-classroom-seat-avatar">${escapeHtml(buildAccountAbbreviation(snapshot.teacherAccountId))}</span>
              <span>${escapeHtml(i18n.t("module.study.classes.teacher"))}: ${escapeHtml(snapshot.teacherAccountId)}</span>
            </div>
          </div>
          <div class="classes-classroom-grid">${seatTiles}</div>
          ${deskPanel}
          ${renderIncomingRequests()}
        `;
    }

    function classroomElement() {
        return {
            id: "classroom-hub",
            title: i18n.t("module.study.classes.classroom_page_title"),
            gridSize: { default: [8, 6], min: [2, 2], max: "full" },
            render() {
                return `
            <section class="classes-section classes-classroom-hub">
              <div class="classes-request-form">
                <label class="classes-section-heading" for="classes-class-select">${escapeHtml(i18n.t("module.study.classes.classroom_select_class"))}</label>
                <select id="classes-class-select" class="classes-language-input">
                  ${renderClassSelectOptions()}
                </select>
              </div>
              <div class="classes-classroom-content">${renderClassroom()}</div>
            </section>
          `;
            },
            onRender() {
                const section = root.querySelector(".classes-classroom-hub");
                if (!(section instanceof HTMLElement)) return;
                if (section.dataset.bound === "true") return;
                section.dataset.bound = "true";

                function refresh() {
                    const content = section.querySelector(
                        ".classes-classroom-content",
                    );
                    if (content instanceof HTMLElement) {
                        content.innerHTML = renderClassroom();
                    }
                }

                section.addEventListener(
                    "change",
                    async (event) => {
                        if (!(event.target instanceof Element)) return;
                        const classSelect = event.target.closest(
                            "#classes-class-select",
                        );
                        if (!(classSelect instanceof HTMLSelectElement)) return;
                        selectedClassId = String(classSelect.value ?? "");
                        selectedSeatNumber = null;
                        await loadClassMeta();
                        refresh();
                    },
                    { signal },
                );

                section.addEventListener(
                    "click",
                    async (event) => {
                        if (!(event.target instanceof Element)) return;
                        const snapshot = selectedSnapshot();
                        if (!snapshot) return;
                        const classId = String(snapshot.id ?? "");

                        const seatButton = event.target.closest(
                            ".classes-classroom-seat",
                        );
                        if (seatButton instanceof HTMLElement) {
                            selectedSeatNumber = Number(
                                seatButton.dataset.seatNumber ?? "-1",
                            );
                            refresh();
                            return;
                        }

                        const openHomeworkButton = event.target.closest(
                            ".classes-open-homework-btn",
                        );
                        if (openHomeworkButton instanceof HTMLElement) {
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

                        const saveNotebookButton = event.target.closest(
                            ".classes-save-notebook-btn",
                        );
                        if (saveNotebookButton instanceof HTMLElement) {
                            const noteInput = section.querySelector(
                                "#classes-own-notebook",
                            );
                            if (!(noteInput instanceof HTMLTextAreaElement))
                                return;
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/notebook`,
                                {
                                    method: "PUT",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        noteText: noteInput.value ?? "",
                                    }),
                                },
                            );
                            showToast(
                                i18n.t(
                                    response.ok
                                        ? "module.study.classes.notebook_saved"
                                        : "module.study.classes.notebook_save_failed",
                                ),
                                { variant: response.ok ? "success" : "error" },
                            );
                            if (response.ok) {
                                selectedNotebookText = noteInput.value ?? "";
                            }
                            return;
                        }

                        const saveMaterialsButton = event.target.closest(
                            ".classes-save-materials-btn",
                        );
                        if (saveMaterialsButton instanceof HTMLElement) {
                            const materialsInput =
                                section.querySelector("#classes-materials");
                            const homeworkInput =
                                section.querySelector("#classes-homework");
                            if (
                                !(
                                    materialsInput instanceof
                                    HTMLTextAreaElement
                                ) ||
                                !(homeworkInput instanceof HTMLTextAreaElement)
                            )
                                return;
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/resources`,
                                {
                                    method: "PUT",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        materials: materialsInput.value ?? "",
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
                                { variant: response.ok ? "success" : "error" },
                            );
                            if (response.ok) {
                                classResources.materials =
                                    materialsInput.value ?? "";
                                classResources.homework =
                                    homeworkInput.value ?? "";
                            }
                            return;
                        }

                        const openNotebookButton = event.target.closest(
                            ".classes-open-notebook-btn",
                        );
                        if (openNotebookButton instanceof HTMLElement) {
                            const studentId =
                                openNotebookButton.dataset.studentId ?? "";
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/notebooks/${encodeURIComponent(studentId)}`,
                            );
                            if (response.ok) {
                                const notePayload = await response.json();
                                await openPopup({
                                    title: i18n.t(
                                        "module.study.classes.open_notebook",
                                    ),
                                    body: `<p>${escapeHtml(notePayload?.data?.noteText || i18n.t("module.study.classes.empty_notebook"))}</p>`,
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
                                response.status === 403 &&
                                studentId !== viewerAccountId
                            ) {
                                const requestResponse = await apiFetch(
                                    `/api/v1/study/classes/${encodeURIComponent(classId)}/notebooks/${encodeURIComponent(studentId)}/request`,
                                    { method: "POST" },
                                );
                                showToast(
                                    i18n.t(
                                        requestResponse.ok
                                            ? "module.study.classes.note_request_sent"
                                            : "module.study.classes.note_request_failed",
                                    ),
                                    {
                                        variant: requestResponse.ok
                                            ? "success"
                                            : "error",
                                    },
                                );
                                return;
                            }
                            showToast(
                                i18n.t(
                                    "module.study.classes.notebook_load_failed",
                                ),
                                { variant: "error" },
                            );
                            return;
                        }

                        const noteReviewButton = event.target.closest(
                            ".classes-note-review-btn",
                        );
                        if (noteReviewButton instanceof HTMLElement) {
                            const viewerStudentId =
                                noteReviewButton.dataset.viewerId ?? "";
                            const action =
                                noteReviewButton.dataset.action ?? "reject";
                            const response = await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(classId)}/notebooks/${encodeURIComponent(viewerAccountId)}/requests/${encodeURIComponent(viewerStudentId)}/${action}`,
                                { method: "POST" },
                            );
                            showToast(
                                i18n.t(
                                    response.ok
                                        ? "module.study.classes.note_request_reviewed"
                                        : "module.study.classes.note_request_review_failed",
                                ),
                                { variant: response.ok ? "success" : "error" },
                            );
                            if (response.ok) {
                                await loadClassMeta();
                                refresh();
                            }
                        }
                    },
                    { signal },
                );
            },
        };
    }

    try {
        await loadClassrooms();
        await loadClassMeta();
    } catch (error) {
        console.error(
            "[classes-classroom] failed to initialize classroom hub",
            {
                error,
            },
        );
        showToast(i18n.t("module.study.classes.load_failed"), {
            variant: "error",
        });
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [classroomElement()],
        preferenceKey: "classes-classroom-hub-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.classroom_page_title"),
            subtitle: i18n.t("module.study.classes.classroom_page_subtitle"),
        },
    });
    await composer.init();
}

await mountWhenDirect(mount);
