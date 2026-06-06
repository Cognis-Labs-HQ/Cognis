import { escapeHtml } from "/static/reuse/escape-html.js";

const DEFAULT_CLASSROOM_CAPACITY = 30;

export function normalizeSeatAssignments(rawSeatAssignments) {
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

export function buildAccountLabel(member) {
    return (
        String(member?.displayName ?? "").trim() ||
        String(member?.handle ?? "").trim() ||
        String(member?.studentAccountId ?? "").trim()
    );
}

export function buildAccountAbbreviation(member) {
    const accountLabel = buildAccountLabel(member);
    if (!accountLabel) return "??";
    return accountLabel.slice(0, 2).toUpperCase();
}

function buildLanguageFilterOptions({ availableClasses }) {
    return [
        ...new Set(availableClasses.map((classRow) => classRow.languageCode)),
    ].sort();
}

function renderAgendaItems({ activeAgendaItems, i18n }) {
    if (!activeAgendaItems.length) {
        return `<p class="classes-empty classes-empty--compact">${escapeHtml(i18n.t("module.study.classes.no_active_agenda"))}</p>`;
    }
    return `
        <ul class="classes-agenda-list">
            ${activeAgendaItems
                .map(
                    (item) => `
                        <li class="classes-agenda-item">
                            <strong>${escapeHtml(item.title ?? "")}</strong>
                            <span>${escapeHtml(item.description ?? "")}</span>
                        </li>
                    `,
                )
                .join("")}
        </ul>
    `;
}

function renderClassroomBoard({
    snapshot,
    classResources,
    activeAgendaItems,
    i18n,
    isTeacherView,
}) {
    return `
        <div class="classes-classroom-board-area">
            <div class="classes-classroom-blackboard">
                <div class="classes-classroom-board-header">
                    <h4>${escapeHtml(i18n.t("module.study.classes.classroom_blackboard"))}</h4>
                    <div class="classes-classroom-board-actions">
                        <button type="button" class="classes-icon-btn classes-open-chat-btn" ${snapshot?.chatUrl ? "" : "disabled"} aria-label="${escapeHtml(i18n.t("module.study.classes.open_chat"))}" title="${escapeHtml(i18n.t("module.study.classes.open_chat"))}">💬</button>
                        <button type="button" class="classes-icon-btn classes-open-meeting-btn" aria-label="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}" title="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}">📹</button>
                        ${
                            isTeacherView
                                ? `<button type="button" class="classes-icon-btn classes-create-agenda-btn" aria-label="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}" title="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}">🗓</button>`
                                : ""
                        }
                    </div>
                </div>
                <label class="classes-section-heading" for="classes-materials">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</label>
                <textarea id="classes-materials" class="classes-classroom-editor"${isTeacherView ? "" : " readonly"}>${escapeHtml(classResources.materials ?? "")}</textarea>
                <label class="classes-section-heading" for="classes-homework">${escapeHtml(i18n.t("module.study.classes.assigned_homework"))}</label>
                <textarea id="classes-homework" class="classes-classroom-editor"${isTeacherView ? "" : " readonly"}>${escapeHtml(classResources.homework ?? "")}</textarea>
                <div class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.class_agenda"))}</div>
                ${renderAgendaItems({ activeAgendaItems, i18n })}
                ${
                    isTeacherView
                        ? `<button type="button" class="btn-confirm btn-animated classes-save-materials-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>`
                        : ""
                }
            </div>
            <div class="classes-classroom-teacher">
                <span class="classes-classroom-seat-avatar">${escapeHtml(buildAccountAbbreviation({ displayName: snapshot.teacherAccountId }))}</span>
                <span>${escapeHtml(i18n.t("module.study.classes.teacher"))}: ${escapeHtml(snapshot.teacherAccountId)}</span>
            </div>
        </div>
    `;
}

function renderSeatTiles({ snapshot, selectedSeatNumber, i18n }) {
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
    const membersBySeat = new Map();
    for (const member of members) {
        const seatNumber =
            seatAssignments[String(member.studentAccountId ?? "")];
        if (!Number.isInteger(seatNumber) || seatNumber < 0) continue;
        membersBySeat.set(seatNumber, member);
    }
    return Array.from({ length: normalizedStudentLimit })
        .map((_, seatNumber) => {
            const member = membersBySeat.get(seatNumber) ?? null;
            return `
                <button
                    type="button"
                    class="classes-classroom-seat${member ? " occupied" : ""}${
                        Number(selectedSeatNumber) === seatNumber
                            ? " selected"
                            : ""
                    }"
                    data-seat-number="${seatNumber}"
                    data-student-id="${escapeHtml(String(member?.studentAccountId ?? ""))}"
                    data-student-handle="${escapeHtml(String(member?.handle ?? ""))}"
                >
                    <span class="classes-classroom-seat-icon">🪑</span>
                    <span class="classes-classroom-seat-label">${escapeHtml(i18n.t("module.study.classes.classroom_seat"))} ${seatNumber + 1}</span>
                    <span class="classes-classroom-seat-avatar">${member ? escapeHtml(buildAccountAbbreviation(member)) : "—"}</span>
                    <span class="classes-classroom-seat-name">${member ? escapeHtml(buildAccountLabel(member)) : escapeHtml(i18n.t("module.study.classes.empty_seat"))}</span>
                </button>
            `;
        })
        .join("");
}

function renderSelectedDeskPanel({
    snapshot,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
}) {
    if (selectedSeatNumber == null || !snapshot) return "";
    const seatAssignments = normalizeSeatAssignments(
        snapshot?.classroom?.seatAssignments,
    );
    const selectedMember =
        (snapshot.members ?? []).find(
            (member) =>
                Number(
                    seatAssignments[String(member.studentAccountId ?? "")],
                ) === Number(selectedSeatNumber),
        ) ?? null;
    if (!selectedMember) return "";
    return `
        <div class="classes-manage-panel">
            <h4 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.selected_desk"))}</h4>
            <strong>${escapeHtml(buildAccountLabel(selectedMember))}</strong>
            <button type="button" class="btn-confirm btn-animated classes-open-notebook-btn" data-student-id="${escapeHtml(selectedMember.studentAccountId)}">${escapeHtml(i18n.t("module.study.classes.open_notebook"))}</button>
            <button type="button" class="btn-confirm btn-animated classes-open-homework-btn">${escapeHtml(i18n.t("module.study.classes.open_textbook"))}</button>
            <label class="classes-section-heading" for="classes-own-notebook">${escapeHtml(i18n.t("module.study.classes.my_notebook"))}</label>
            <textarea id="classes-own-notebook" class="classes-notebook-editor">${escapeHtml(selectedNotebookText)}</textarea>
            <button type="button" class="btn-confirm btn-animated classes-save-notebook-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
        </div>
    `;
}

function renderTeacherEmptyState({ i18n }) {
    return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_teacher_classes"))}</p>`;
}

function renderStudentAvailableClasses({
    availableClasses,
    selectedLanguageFilter,
    searchQuery,
    i18n,
}) {
    const languagePills = buildLanguageFilterOptions({ availableClasses });
    return `
        <div class="classes-browse-panel">
            <div class="classes-filter-row">
                <input type="search" class="classes-search-input classes-available-search" placeholder="${escapeHtml(i18n.t("module.study.classes.search_available_classes"))}" value="${escapeHtml(searchQuery)}" />
                <button type="button" class="classes-filter-pill${
                    selectedLanguageFilter ? "" : " active"
                }" data-language="">${escapeHtml(i18n.t("module.study.classes.all_languages"))}</button>
                ${languagePills
                    .map(
                        (languageCode) => `
                            <button type="button" class="classes-filter-pill${
                                selectedLanguageFilter === languageCode
                                    ? " active"
                                    : ""
                            }" data-language="${escapeHtml(languageCode)}">${escapeHtml(languageCode)}</button>
                        `,
                    )
                    .join("")}
            </div>
            ${
                availableClasses.length
                    ? `<ul class="classes-list">
                        ${availableClasses
                            .map(
                                (classRow) => `
                                    <li class="classes-item">
                                        <span class="classes-language">${escapeHtml(classRow.languageCode)}</span>
                                        <span class="classes-member-count">${escapeHtml(i18n.t("module.study.classes.teacher"))}: ${escapeHtml(classRow.teacherAccountId)}</span>
                                        <button type="button" class="btn-confirm btn-animated classes-join-btn" data-class-id="${escapeHtml(classRow.id)}" data-join-mode="${escapeHtml(classRow.joinMode ?? "on_request")}">${escapeHtml(
                                            classRow.joinMode === "open"
                                                ? i18n.t(
                                                      "module.study.classes.join_open",
                                                  )
                                                : i18n.t(
                                                      "module.study.classes.join_request",
                                                  ),
                                        )}</button>
                                    </li>
                                `,
                            )
                            .join("")}
                    </ul>`
                    : `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_available_classes"))}</p>`
            }
        </div>
    `;
}

function renderClassroomView({
    snapshot,
    classResources,
    activeAgendaItems,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
    isTeacherView,
    availableClasses,
    selectedLanguageFilter,
    searchQuery,
}) {
    if (!snapshot) {
        return isTeacherView
            ? renderTeacherEmptyState({ i18n })
            : renderStudentAvailableClasses({
                  availableClasses,
                  selectedLanguageFilter,
                  searchQuery,
                  i18n,
              });
    }
    return `
        <section class="classes-section classes-classroom-hub">
            ${renderClassroomBoard({
                snapshot,
                classResources,
                activeAgendaItems,
                i18n,
                isTeacherView,
            })}
            <div class="classes-classroom-grid">${renderSeatTiles({
                snapshot,
                selectedSeatNumber,
                i18n,
            })}</div>
            ${renderSelectedDeskPanel({
                snapshot,
                selectedSeatNumber,
                selectedNotebookText,
                i18n,
            })}
            ${
                !isTeacherView
                    ? `<button type="button" class="btn-cancel btn-animated classes-leave-classroom-btn">${escapeHtml(i18n.t("module.study.classes.leave_class"))}</button>`
                    : ""
            }
        </section>
    `;
}

export function renderClassroomPage(input) {
    return `<div class="classes-classroom-content">${renderClassroomView(input)}</div>`;
}
