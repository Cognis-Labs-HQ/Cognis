import { escapeHtml } from "/static/reuse/escape-html.js";

const DEFAULT_CLASSROOM_CAPACITY = 20;

/** @param {unknown} rawSeatAssignments */
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

/** Returns how many desk columns to use for a given student capacity. */
function computeDesksPerRow(studentLimit) {
    if (studentLimit <= 6) return 3;
    if (studentLimit <= 10) return 4;
    if (studentLimit <= 18) return 6;
    if (studentLimit <= 28) return 7;
    return 8;
}

function renderChalkAgenda({ activeAgendaItems, i18n }) {
    if (!activeAgendaItems.length) {
        return `<span class="classes-chalk-empty">${escapeHtml(i18n.t("module.study.classes.no_active_agenda"))}</span>`;
    }
    return activeAgendaItems
        .map(
            (item) => `
                <div class="classes-chalk-item" data-agenda-id="${escapeHtml(String(item.id ?? ""))}">
                    <span class="classes-chalk-title">${escapeHtml(item.title ?? "")}</span>
                    ${item.description ? `<span class="classes-chalk-desc">${escapeHtml(item.description)}</span>` : ""}
                </div>
            `,
        )
        .join("");
}

function renderBlackboard({
    snapshot,
    activeAgendaItems,
    i18n,
    isTeacherView,
    canToggleView,
    currentViewMode,
}) {
    return `
        <div class="classes-blackboard" role="region" aria-label="${escapeHtml(i18n.t("module.study.classes.classroom_blackboard"))}">
            <div class="classes-blackboard-header">
                <span class="classes-chalk-header">${escapeHtml(i18n.t("module.study.classes.class_agenda"))}</span>
                <div class="classes-blackboard-actions">
                    <button type="button" class="classes-icon-btn classes-open-chat-btn"
                        ${snapshot?.chatUrl ? "" : "disabled"}
                        aria-label="${escapeHtml(i18n.t("module.study.classes.open_chat"))}"
                        title="${escapeHtml(i18n.t("module.study.classes.open_chat"))}">💬</button>
                    <button type="button" class="classes-icon-btn classes-open-meeting-btn"
                        aria-label="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}"
                        title="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}">📹</button>
                    ${
                        canToggleView
                            ? `<button type="button" class="classes-icon-btn classes-toggle-view-btn"
                                aria-label="${escapeHtml(
                                    i18n.t(
                                        currentViewMode === "teacher"
                                            ? "module.study.classes.enter_student_view"
                                            : "module.study.classes.enter_teacher_view",
                                    ),
                                )}"
                                title="${escapeHtml(
                                    i18n.t(
                                        currentViewMode === "teacher"
                                            ? "module.study.classes.enter_student_view"
                                            : "module.study.classes.enter_teacher_view",
                                    ),
                                )}">👁️</button>`
                            : ""
                    }
                    ${
                        isTeacherView
                            ? `<button type="button" class="classes-icon-btn classes-create-agenda-btn"
                                   aria-label="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}"
                                   title="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}">🗓</button>`
                            : ""
                    }
                </div>
            </div>
            <div class="classes-blackboard-surface">
                ${renderChalkAgenda({ activeAgendaItems, i18n })}
                ${renderStudentRoster({ snapshot, i18n })}
            </div>
            <div class="classes-blackboard-ledge"></div>
        </div>
    `;
}

function renderStudentRoster({ snapshot, i18n }) {
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const rows = members
        .map(
            (member) => `
                <li class="classes-roster-item" data-student-id="${escapeHtml(String(member.studentAccountId ?? ""))}">
                    <span class="classes-roster-avatar">${escapeHtml(buildAccountAbbreviation(member))}</span>
                    <span class="classes-roster-name">${escapeHtml(buildAccountLabel(member))}</span>
                </li>
            `,
        )
        .join("");
    return `
        <div class="classes-student-roster">
            <div class="classes-roster-header">👥 ${escapeHtml(i18n.t("module.study.classes.members_section"))}</div>
            <ul class="classes-roster-list">${rows || `<li class="classes-empty classes-empty--compact">${escapeHtml(i18n.t("module.study.classes.no_members"))}</li>`}</ul>
        </div>
    `;
}

function renderDeskUnit({ seatNumber, member, selected, isTeacherView, i18n }) {
    const occupied = Boolean(member);
    const classNames = [
        "classes-desk-unit",
        occupied ? "occupied" : "",
        selected ? "selected" : "",
    ]
        .filter(Boolean)
        .join(" ");
    return `
        <div class="${classNames}"
             data-seat-number="${seatNumber}"
             data-student-id="${escapeHtml(String(member?.studentAccountId ?? ""))}"
             data-student-handle="${escapeHtml(String(member?.handle ?? ""))}"
             ${isTeacherView && occupied ? 'draggable="true"' : ""}
             title="${occupied ? escapeHtml(buildAccountLabel(member)) : escapeHtml(i18n.t("module.study.classes.empty_seat"))}">
            <div class="classes-desk-surface">
                ${occupied ? `<span class="classes-desk-badge" aria-hidden="true">${escapeHtml(buildAccountAbbreviation(member))}</span>` : ""}
            </div>
            <div class="classes-desk-nameplate">
                <span class="classes-status-light classes-status-light--${escapeHtml(
                    String(member?.presence ?? "offline"),
                )}"></span>
                <span class="classes-desk-name">${escapeHtml(occupied ? buildAccountLabel(member) : i18n.t("module.study.classes.empty_seat"))}</span>
            </div>
            <div class="classes-chair-element"></div>
        </div>
    `;
}

function renderDeskFloor({
    snapshot,
    selectedSeatNumber,
    i18n,
    isTeacherView,
}) {
    const rawLimit = Number(snapshot?.classroom?.studentLimit);
    const studentLimit =
        Number.isInteger(rawLimit) && rawLimit > 0
            ? rawLimit
            : DEFAULT_CLASSROOM_CAPACITY;
    const seatAssignments = normalizeSeatAssignments(
        snapshot?.classroom?.seatAssignments,
    );
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const membersBySeat = new Map();
    for (const member of members) {
        const seat = Number(
            seatAssignments[String(member.studentAccountId ?? "")],
        );
        if (!Number.isInteger(seat) || seat < 0) continue;
        membersBySeat.set(seat, member);
    }
    const desksPerRow = computeDesksPerRow(studentLimit);
    const rowCount = Math.ceil(studentLimit / desksPerRow);
    let seatCounter = 0;
    const rowHtml = Array.from({ length: rowCount }, () => {
        const units = [];
        for (
            let col = 0;
            col < desksPerRow && seatCounter < studentLimit;
            col++
        ) {
            const seatNum = seatCounter++;
            units.push(
                renderDeskUnit({
                    seatNumber: seatNum,
                    member: membersBySeat.get(seatNum) ?? null,
                    selected: Number(selectedSeatNumber) === seatNum,
                    isTeacherView,
                    i18n,
                }),
            );
        }
        // Group desks into pairs with an aisle between each pair
        const pairs = [];
        for (let i = 0; i < units.length; i += 2) {
            pairs.push(
                `<div class="classes-desk-pair">${units.slice(i, i + 2).join("")}</div>`,
            );
        }
        return `<div class="classes-desk-row">${pairs.join("")}</div>`;
    }).join("");
    return `<div class="classes-desk-floor">${rowHtml}</div>`;
}

function renderRoomDoor({ i18n, isTeacherView }) {
    return `
        <div class="classes-room-doorwall">
            <div class="classes-room-door" id="study-classroom-door"
                 role="button" tabindex="0"
                 title="${escapeHtml(i18n.t(isTeacherView ? "module.study.classes.disband_class_action" : "module.study.classes.leave_class"))}">
                <div class="classes-door-topdown">
                   <div class="classes-door-swing"></div>
                   <div class="classes-door-knob"></div>
                </div>
            </div>
        </div>
    `;
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

function renderMaterialsEditor({ classResources, i18n }) {
    return `
        <details class="classes-materials-editor">
            <summary class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</summary>
            <div class="classes-materials-editor-body">
                <label class="classes-section-heading" for="classes-materials">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</label>
                <textarea id="classes-materials" class="classes-classroom-editor">${escapeHtml(classResources.materials ?? "")}</textarea>
                <label class="classes-section-heading" for="classes-homework">${escapeHtml(i18n.t("module.study.classes.assigned_homework"))}</label>
                <textarea id="classes-homework" class="classes-classroom-editor">${escapeHtml(classResources.homework ?? "")}</textarea>
                <button type="button" class="btn-confirm btn-animated classes-save-materials-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
            </div>
        </details>
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
                                        <span class="classes-language">${escapeHtml(classRow.name || classRow.languageName || classRow.languageCode)}</span>
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
    canToggleView,
    currentViewMode,
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
            <div class="classes-room">
                <div class="classes-room-top">
                    ${renderBlackboard({ snapshot, activeAgendaItems, i18n, isTeacherView, canToggleView, currentViewMode })}
                    ${renderRoomDoor({ i18n, isTeacherView })}
                </div>
                ${renderDeskFloor({ snapshot, selectedSeatNumber, i18n, isTeacherView })}
            </div>
            ${isTeacherView ? renderMaterialsEditor({ classResources, i18n }) : ""}
            ${renderSelectedDeskPanel({ snapshot, selectedSeatNumber, selectedNotebookText, i18n })}
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
