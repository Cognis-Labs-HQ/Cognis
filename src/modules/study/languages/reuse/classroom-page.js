/**
 * Shared Study Classroom page renderer for language module child components.
 *
 * Public exports:
 *   mountStudyClassroomPage — mounts the classroom view for a specific
 *   language module, loading classroom snapshots and wiring up seat
 *   assignment, student removal, and leave-classroom interactions.
 *
 * Usage:
 *   import { mountStudyClassroomPage } from
 *     '/static/modules/study/languages/reuse/classroom-page.js';
 *
 *   export async function mount(root, { signal } = {}) {
 *     await mountStudyClassroomPage(root, { signal, languageCode: 'en' });
 *   }
 *
 * @param {HTMLElement} root - The root element passed to the page mount function.
 * @param {{ signal?: AbortSignal, languageCode: string }} options
 *   languageCode: BCP 47 code of the language whose classroom this page shows.
 *   signal: optional AbortSignal from the SPA router for event cleanup.
 * @returns {Promise<void>}
 */

import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { showToast } from "/static/reuse/toast.js";
import { isTeacherScope } from "/static/reuse/access-role.js";
import {
    loadFooterClasses,
    createClassFooterItem,
} from "/static/adapters/study/classes/study-footer.js";
import {
    applyClassroomViewModeFromUrl,
    getClassroomViewMode,
} from "/static/adapters/study/classes/view-mode.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";

function normalizeSeatAssignments(rawSeatAssignments) {
    if (!rawSeatAssignments || typeof rawSeatAssignments !== "object") {
        return {};
    }
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

function buildAccountInitials(accountId) {
    const normalizedAccountId = String(accountId ?? "").trim();
    if (!normalizedAccountId) {
        return "??";
    }
    return normalizedAccountId.slice(0, 2).toUpperCase();
}

export async function mountStudyClassroomPage(root, { signal, languageCode }) {
    applyClassroomViewModeFromUrl();
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "gateway.study.classroom_page_title");

    const currentPath = window.location.pathname;
    const subNavigationModel = await loadStudySubNavigationModel({
        fallbackLanguageCode: languageCode,
    });

    let classroomSnapshots = [];
    let footerClasses = [];
    let selectedClassId = "";
    let selectedSeatNumber = null;

    const isTeacher = isTeacherScope() && getClassroomViewMode() === "teacher";
    const viewerAccountId = String(
        localStorage.getItem("cognis_account") ?? "",
    ).trim();

    function getSelectedSnapshot() {
        return (
            classroomSnapshots.find(
                (snapshot) => snapshot.id === selectedClassId,
            ) ?? null
        );
    }

    async function loadClassrooms() {
        const params = new URLSearchParams();
        if (languageCode) {
            params.set("language", languageCode);
        }
        if (
            isTeacherScope() &&
            getClassroomViewMode &&
            getClassroomViewMode() === "student"
        ) {
            params.set("student", "true");
        }
        const response = await apiFetch(
            `/api/v1/study/classrooms${params.toString() ? `?${params.toString()}` : ""}`,
        );
        if (!response.ok) {
            throw new Error(i18n.t("gateway.study.classroom_load_failed"));
        }
        const payload = await response.json();
        classroomSnapshots = Array.isArray(payload?.data) ? payload.data : [];
        if (
            !selectedClassId ||
            !classroomSnapshots.some(
                (snapshot) => snapshot.id === selectedClassId,
            )
        ) {
            selectedClassId = String(classroomSnapshots[0]?.id ?? "");
        }
    }

    function updateLocalSeatAssignment(studentAccountId, newSeatNumber) {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) return;
        const currentAssignments = normalizeSeatAssignments(
            selectedSnapshot?.classroom?.seatAssignments,
        );
        if (newSeatNumber == null) {
            delete currentAssignments[studentAccountId];
        } else {
            currentAssignments[studentAccountId] = newSeatNumber;
        }
        selectedSnapshot.classroom = {
            ...(selectedSnapshot.classroom ?? {}),
            seatAssignments: currentAssignments,
        };
    }

    async function persistClassroomState(partialState) {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) return;
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(selectedSnapshot.id)}/layout`,
            {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(partialState),
            },
        );
        if (!response.ok) {
            throw new Error(i18n.t("gateway.study.classroom_save_failed"));
        }
        const payload = await response.json();
        selectedSnapshot.classroom =
            payload?.data ?? selectedSnapshot.classroom;
    }

    async function moveStudent(studentAccountId, newSeatNumber) {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) return;
        const seatAssignments = normalizeSeatAssignments(
            selectedSnapshot?.classroom?.seatAssignments,
        );
        seatAssignments[studentAccountId] = newSeatNumber;
        await persistClassroomState({
            seatAssignments,
            studentLimit: Number(
                selectedSnapshot?.classroom?.studentLimit ?? 30,
            ),
        });
    }

    async function removeStudent(studentAccountId) {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) return;
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(selectedSnapshot.id)}/students/${encodeURIComponent(studentAccountId)}`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            throw new Error(i18n.t("gateway.study.classroom_remove_failed"));
        }
        selectedSnapshot.members = (selectedSnapshot.members ?? []).filter(
            (member) => member.studentAccountId !== studentAccountId,
        );
        updateLocalSeatAssignment(studentAccountId, null);
    }

    async function leaveClassroom() {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) return;
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(selectedSnapshot.id)}/membership`,
            { method: "DELETE" },
        );
        if (!response.ok) {
            throw new Error(i18n.t("module.study.classes.leave_failed"));
        }
        await loadClassrooms();
    }

    function renderClassOptions() {
        if (!classroomSnapshots.length) {
            return `<option value="">${escapeHtml(i18n.t("gateway.study.classroom_no_classes"))}</option>`;
        }
        return classroomSnapshots
            .map((snapshot) => {
                const selectedAttribute =
                    snapshot.id === selectedClassId ? " selected" : "";
                const label = `${snapshot.languageCode} · ${snapshot.id}`;
                return `<option value="${escapeHtml(snapshot.id)}"${selectedAttribute}>${escapeHtml(label)}</option>`;
            })
            .join("");
    }

    function renderClassroom() {
        const selectedSnapshot = getSelectedSnapshot();
        if (!selectedSnapshot) {
            return `<p class="study-classroom-empty">${escapeHtml(i18n.t("gateway.study.classroom_no_classes"))}</p>`;
        }
        const studentLimit = Number(
            selectedSnapshot?.classroom?.studentLimit ?? 30,
        );
        const normalizedStudentLimit =
            Number.isInteger(studentLimit) && studentLimit > 0
                ? studentLimit
                : 30;
        const seatAssignments = normalizeSeatAssignments(
            selectedSnapshot?.classroom?.seatAssignments,
        );
        const members = Array.isArray(selectedSnapshot.members)
            ? selectedSnapshot.members
            : [];
        const maxColumns = Math.min(
            10,
            Math.max(2, Math.ceil(Math.sqrt(normalizedStudentLimit * 1.8))),
        );
        let gridColumns = Math.min(4, normalizedStudentLimit);
        let bestScore = Number.POSITIVE_INFINITY;
        for (let columns = 2; columns <= maxColumns; columns++) {
            const rows = Math.ceil(normalizedStudentLimit / columns);
            const emptySeats = rows * columns - normalizedStudentLimit;
            const score =
                Math.abs(rows - columns) * 2 +
                emptySeats * 1.25 +
                (normalizedStudentLimit % columns === 1 ? 1.5 : 0);
            if (score < bestScore) {
                bestScore = score;
                gridColumns = columns;
            }
        }
        const studentBySeatNumber = new Map();
        for (const member of members) {
            const studentAccountId = String(member.studentAccountId ?? "");
            const seatNumber = seatAssignments[studentAccountId];
            if (Number.isInteger(seatNumber) && seatNumber >= 0) {
                studentBySeatNumber.set(seatNumber, studentAccountId);
            }
        }

        const seatTiles = Array.from({ length: normalizedStudentLimit })
            .map((_, seatNumber) => {
                const studentAccountId = studentBySeatNumber.get(seatNumber);
                const isSelected = selectedSeatNumber === seatNumber;
                const occupiedClass = studentAccountId ? " occupied" : "";
                const selectedClass = isSelected ? " selected" : "";
                const draggableAttribute =
                    isTeacher && studentAccountId ? ' draggable="true"' : "";
                return `
                    <button
                        type="button"
                        class="study-classroom-seat${occupiedClass}${selectedClass}"
                        data-seat-number="${seatNumber}"
                        data-student-account-id="${escapeHtml(studentAccountId ?? "")}"${draggableAttribute}
                    >
                        <span class="study-classroom-seat-icon">🪑</span>
                        <span class="study-classroom-seat-label">${escapeHtml(i18n.t("gateway.study.classroom_seat"))} ${seatNumber + 1}</span>
                        ${studentAccountId ? `<span class="study-classroom-seat-bag">🎒</span><span class="study-classroom-seat-avatar">${escapeHtml(buildAccountInitials(studentAccountId))}</span>` : '<span class="study-classroom-seat-empty"></span>'}
                    </button>
                `;
            })
            .join("");

        const selectedSeatStudentAccountId =
            selectedSeatNumber != null
                ? studentBySeatNumber.get(selectedSeatNumber)
                : "";

        const teacherControls = isTeacher
            ? `
                <div class="study-classroom-controls">
                    <label>
                        ${escapeHtml(i18n.t("gateway.study.classroom_student_limit"))}
                        <input type="number" min="1" max="100" step="1" id="study-classroom-student-limit" value="${normalizedStudentLimit}" />
                    </label>
                    <button type="button" class="btn-confirm btn-animated" id="study-classroom-save-limit">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
                </div>
                <div class="study-classroom-controls">
                    <button type="button" class="btn-confirm btn-animated" id="study-classroom-move-first-empty" ${selectedSeatStudentAccountId ? "" : "disabled"}>${escapeHtml(i18n.t("gateway.study.classroom_move_first_empty"))}</button>
                    <button type="button" class="btn-cancel btn-animated" id="study-classroom-remove-student" ${selectedSeatStudentAccountId ? "" : "disabled"}>${escapeHtml(i18n.t("gateway.study.classroom_remove_student"))}</button>
                </div>
            `
            : `
                <div class="study-classroom-controls">
                    <button type="button" class="btn-cancel btn-animated" id="study-classroom-leave">${escapeHtml(i18n.t("module.study.classes.leave_class"))}</button>
                </div>
            `;
        const teacherDeskTile = `
            <div class="study-classroom-seat study-classroom-seat--teacher">
                <span class="study-classroom-seat-icon">👩‍🏫</span>
                <span class="study-classroom-seat-label">${escapeHtml(i18n.t("ui.reuse.teacher"))}</span>
                <span class="study-classroom-seat-avatar">${escapeHtml(buildAccountInitials(selectedSnapshot.teacherAccountId))}</span>
            </div>
        `;

        return `
            <div class="study-classroom-board-area">
                <div class="study-classroom-board">${escapeHtml(i18n.t("gateway.study.classroom_blackboard"))}</div>
                <div class="study-classroom-door" id="study-classroom-door" data-door="true">🚪 ${escapeHtml(i18n.t("gateway.study.classroom_door"))}</div>
            </div>
            ${teacherControls}
            <div class="study-classroom-grid" id="study-classroom-grid" style="grid-template-columns: repeat(${gridColumns}, minmax(126px, 1fr));">${teacherDeskTile}${seatTiles}</div>
        `;
    }

    function renderSubNavigation() {
        return renderStudySubNavigation({
            model: subNavigationModel,
            currentPath,
            i18n,
        });
    }

    const pageComposer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: `study-${languageCode}-classroom`,
                label: i18n.t("gateway.study.classroom_page_title"),
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                    <section class="study-classroom-page">
                        <div id="study-classroom-content">${renderClassroom()}</div>
                    </section>
                `,
                onRender: () => {
                    if (root.dataset.classroomBound === "true") return;
                    root.dataset.classroomBound = "true";
                    const classroomContentElement = root.querySelector(
                        "#study-classroom-content",
                    );
                    if (!(classroomContentElement instanceof HTMLElement))
                        return;

                    function refreshClassroomContent() {
                        classroomContentElement.innerHTML = renderClassroom();
                    }

                    classroomContentElement.addEventListener(
                        "click",
                        async (event) => {
                            if (!(event.target instanceof Element)) return;
                            const seatButtonElement = event.target.closest(
                                ".study-classroom-seat",
                            );
                            if (seatButtonElement instanceof HTMLElement) {
                                selectedSeatNumber = Number(
                                    seatButtonElement.dataset.seatNumber,
                                );
                                refreshClassroomContent();
                                return;
                            }

                            const saveStudentLimitButton = event.target.closest(
                                "#study-classroom-save-limit",
                            );
                            if (saveStudentLimitButton instanceof HTMLElement) {
                                const studentLimitInput =
                                    classroomContentElement.querySelector(
                                        "#study-classroom-student-limit",
                                    );
                                const nextStudentLimit = Number(
                                    studentLimitInput?.value ?? "30",
                                );
                                try {
                                    await persistClassroomState({
                                        studentLimit: nextStudentLimit,
                                    });
                                    showToast(
                                        i18n.t(
                                            "gateway.study.classroom_save_success",
                                        ),
                                        {
                                            variant: "success",
                                        },
                                    );
                                    refreshClassroomContent();
                                } catch (error) {
                                    showToast(
                                        error instanceof Error
                                            ? error.message
                                            : i18n.t(
                                                  "gateway.study.classroom_save_failed",
                                              ),
                                        { variant: "error" },
                                    );
                                }
                                return;
                            }

                            const removeStudentButton = event.target.closest(
                                "#study-classroom-remove-student",
                            );
                            if (removeStudentButton instanceof HTMLElement) {
                                const selectedSnapshot = getSelectedSnapshot();
                                const selectedStudentAccountId =
                                    selectedSeatNumber == null
                                        ? ""
                                        : (Object.entries(
                                              normalizeSeatAssignments(
                                                  selectedSnapshot?.classroom
                                                      ?.seatAssignments,
                                              ),
                                          ).find(
                                              ([, seatNumber]) =>
                                                  Number(seatNumber) ===
                                                  Number(selectedSeatNumber),
                                          )?.[0] ?? "");
                                if (!selectedStudentAccountId) return;
                                try {
                                    await removeStudent(
                                        selectedStudentAccountId,
                                    );
                                    showToast(
                                        i18n.t(
                                            "gateway.study.classroom_remove_success",
                                        ),
                                        { variant: "success" },
                                    );
                                    refreshClassroomContent();
                                } catch (error) {
                                    showToast(
                                        error instanceof Error
                                            ? error.message
                                            : i18n.t(
                                                  "gateway.study.classroom_remove_failed",
                                              ),
                                        { variant: "error" },
                                    );
                                }
                                return;
                            }

                            const moveToFirstEmptyButton = event.target.closest(
                                "#study-classroom-move-first-empty",
                            );
                            if (moveToFirstEmptyButton instanceof HTMLElement) {
                                const selectedSnapshot = getSelectedSnapshot();
                                const seatAssignments =
                                    normalizeSeatAssignments(
                                        selectedSnapshot?.classroom
                                            ?.seatAssignments,
                                    );
                                const selectedStudentAccountId =
                                    selectedSeatNumber == null
                                        ? ""
                                        : (Object.entries(seatAssignments).find(
                                              ([, seatNumber]) =>
                                                  Number(seatNumber) ===
                                                  Number(selectedSeatNumber),
                                          )?.[0] ?? "");
                                if (!selectedStudentAccountId) return;
                                const studentLimit = Number(
                                    selectedSnapshot?.classroom?.studentLimit ??
                                        30,
                                );
                                const occupiedSeatNumbers = new Set(
                                    Object.values(seatAssignments).map(Number),
                                );
                                const firstEmptySeatNumber = Array.from(
                                    { length: studentLimit },
                                    (_, seatNumber) => seatNumber,
                                ).find(
                                    (seatNumber) =>
                                        !occupiedSeatNumbers.has(seatNumber),
                                );
                                if (firstEmptySeatNumber == null) return;
                                try {
                                    await moveStudent(
                                        selectedStudentAccountId,
                                        firstEmptySeatNumber,
                                    );
                                    selectedSeatNumber = firstEmptySeatNumber;
                                    refreshClassroomContent();
                                } catch (error) {
                                    showToast(
                                        error instanceof Error
                                            ? error.message
                                            : i18n.t(
                                                  "gateway.study.classroom_save_failed",
                                              ),
                                        { variant: "error" },
                                    );
                                }
                                return;
                            }

                            const leaveButton = event.target.closest(
                                "#study-classroom-leave",
                            );
                            if (leaveButton instanceof HTMLElement) {
                                try {
                                    await leaveClassroom();
                                    showToast(
                                        i18n.t(
                                            "module.study.classes.leave_success",
                                        ),
                                        { variant: "success" },
                                    );
                                    refreshClassroomContent();
                                } catch (error) {
                                    showToast(
                                        error instanceof Error
                                            ? error.message
                                            : i18n.t(
                                                  "module.study.classes.leave_failed",
                                              ),
                                        { variant: "error" },
                                    );
                                }
                            }
                        },
                        { signal },
                    );

                    classroomContentElement.addEventListener(
                        "dragstart",
                        (event) => {
                            if (!isTeacher) return;
                            if (!(event.target instanceof HTMLElement)) return;
                            const seatButtonElement = event.target.closest(
                                ".study-classroom-seat",
                            );
                            if (!(seatButtonElement instanceof HTMLElement))
                                return;
                            const studentAccountId = String(
                                seatButtonElement.dataset.studentAccountId ??
                                    "",
                            ).trim();
                            const seatNumber = String(
                                seatButtonElement.dataset.seatNumber ?? "",
                            ).trim();
                            if (!studentAccountId || !seatNumber) return;
                            event.dataTransfer?.setData(
                                "application/x-cognis-student-account",
                                studentAccountId,
                            );
                            event.dataTransfer?.setData(
                                "application/x-cognis-seat-number",
                                seatNumber,
                            );
                            event.dataTransfer?.setData(
                                "text/plain",
                                studentAccountId,
                            );
                        },
                        { signal },
                    );

                    classroomContentElement.addEventListener(
                        "dragover",
                        (event) => {
                            if (!isTeacher) return;
                            if (!(event.target instanceof Element)) return;
                            const dropTarget = event.target.closest(
                                ".study-classroom-seat, #study-classroom-door",
                            );
                            if (!dropTarget) return;
                            event.preventDefault();
                        },
                        { signal },
                    );

                    classroomContentElement.addEventListener(
                        "drop",
                        async (event) => {
                            if (!isTeacher) return;
                            if (!(event.target instanceof Element)) return;
                            const dropTarget = event.target.closest(
                                ".study-classroom-seat, #study-classroom-door",
                            );
                            if (!dropTarget) return;
                            event.preventDefault();
                            const studentAccountId = String(
                                event.dataTransfer?.getData(
                                    "application/x-cognis-student-account",
                                ) ?? "",
                            ).trim();
                            if (!studentAccountId) return;

                            if (dropTarget.id === "study-classroom-door") {
                                try {
                                    await removeStudent(studentAccountId);
                                    showToast(
                                        i18n.t(
                                            "gateway.study.classroom_remove_success",
                                        ),
                                        { variant: "success" },
                                    );
                                    refreshClassroomContent();
                                } catch (error) {
                                    showToast(
                                        error instanceof Error
                                            ? error.message
                                            : i18n.t(
                                                  "gateway.study.classroom_remove_failed",
                                              ),
                                        { variant: "error" },
                                    );
                                }
                                return;
                            }

                            const seatNumber = Number(
                                dropTarget.dataset.seatNumber ?? "-1",
                            );
                            if (
                                !Number.isInteger(seatNumber) ||
                                seatNumber < 0
                            ) {
                                return;
                            }
                            try {
                                await moveStudent(studentAccountId, seatNumber);
                                selectedSeatNumber = seatNumber;
                                refreshClassroomContent();
                            } catch (error) {
                                showToast(
                                    error instanceof Error
                                        ? error.message
                                        : i18n.t(
                                              "gateway.study.classroom_save_failed",
                                          ),
                                    { variant: "error" },
                                );
                            }
                        },
                        { signal },
                    );
                },
            },
        ],
        preferenceKey: `study-${languageCode}-classroom-layout`,
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.classroom_page_title"),
            subtitle: i18n.t("gateway.study.classroom_subtitle"),
        },
        toolbar: [],
        subNavigation: [
            {
                id: `study-${languageCode}-classroom-subnav`,
                label: "Study",
                render: renderSubNavigation,
            },
        ],
        footer: [
            createClassFooterItem({
                i18n,
                signal,
                getClasses: () => footerClasses,
                getSelectedClassId: () => selectedClassId,
                onSelectClass: async (classId) => {
                    selectedClassId = classId;
                    selectedSeatNumber = null;
                    await loadClassrooms();
                    const content = root.querySelector(
                        "#study-classroom-content",
                    );
                    if (content instanceof HTMLElement) {
                        content.innerHTML = renderClassroom();
                    }
                },
            }),
        ],
    });

    await loadClassrooms();
    footerClasses = await loadFooterClasses(languageCode);
    await pageComposer.init();
}
