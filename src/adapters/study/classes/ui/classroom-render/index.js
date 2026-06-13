import { escapeHtml } from "/static/reuse/escape-html.js";
import { buildProfileAvatarMarkup } from "/static/gateways/social/reuse/profile-avatar.js";
import {
    buildAccountLabel,
    buildAccountAbbreviation,
    normalizeSeatAssignments,
    renderWorkspaceTabs,
    renderTileLayoutToggleButton,
    renderWorkspaceContent,
    renderRosterPanel,
    renderSidebarPanel,
} from "./workspace.js";

export { buildAccountLabel, buildAccountAbbreviation, renderRosterPanel };

const DEFAULT_STUDENT_CAPACITY = 20;

function renderDeskAvatar(member) {
    if (!member) return "";
    if (member?.identityMasked) {
        return `<span class="classes-desk-avatar-fallback">${escapeHtml(buildAccountAbbreviation(member))}</span>`;
    }
    return buildProfileAvatarMarkup({
        avatarKey: member?.avatarKey ?? null,
        label: buildAccountLabel(member) || "Member",
        colorSeed: member?.handle || member?.studentAccountId || "",
        avatarClass: "classes-desk-avatar",
        imageClass: "classes-desk-avatar-img",
        fallbackClass: "classes-desk-avatar-fallback",
        profileHandle: member?.handle ?? null,
        linkClass: "classes-profile-preview-link",
    });
}

function buildLanguageFilterOptions({ availableClasses }) {
    return [
        ...new Set(availableClasses.map((classRow) => classRow.languageCode)),
    ].sort();
}

function computeDeskLayout(studentLimit) {
    const normalizedLimit = Math.max(1, Number(studentLimit) || 1);
    const maxColumns = Math.min(
        10,
        Math.max(2, Math.ceil(Math.sqrt(normalizedLimit * 1.8))),
    );
    let bestLayout = {
        columns: Math.min(4, normalizedLimit),
        rows: Math.ceil(normalizedLimit / Math.min(4, normalizedLimit)),
        score: Number.POSITIVE_INFINITY,
    };
    for (let columns = 2; columns <= maxColumns; columns++) {
        const rows = Math.ceil(normalizedLimit / columns);
        const emptySeats = rows * columns - normalizedLimit;
        const score =
            Math.abs(rows - columns) * 2 +
            emptySeats * 1.25 +
            (normalizedLimit % columns === 1 ? 1.5 : 0) +
            (columns % 2 === 1 ? 0.35 : 0);
        if (score < bestLayout.score) {
            bestLayout = { columns, rows, score };
        }
    }
    return {
        desksPerRow: bestLayout.columns,
        rowCount: bestLayout.rows,
    };
}

export function renderBlackboard({
    snapshot,
    classResources,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
    isTeacherView,
    canToggleView,
    currentViewMode,
    boardEntities,
    workspaceMode,
    sidebarMode,
    activeMaterialKey,
    whiteboards,
    activeWhiteboard,
    activeWhiteboardId,
    hasActiveMeeting,
    isChatOpen,
    isMeetingOpen,
    blackboardExpanded,
    initializedTiles,
    tileLayout = "stacked",
    tileOrder = [],
    isTeacherPresent = false,
}) {
    const entities = Array.isArray(boardEntities) ? boardEntities : [];
    const renderedEntities = entities
        .filter((entity) => {
            const kind = String(entity?.kind ?? "")
                .trim()
                .toLowerCase();
            if (kind !== "meeting") {
                return true;
            }
            return isTeacherView || hasActiveMeeting || isMeetingOpen;
        })
        .map((entity) => {
            const kind = String(entity?.kind ?? "")
                .trim()
                .toLowerCase();
            const x = Number(entity?.x);
            const y = Number(entity?.y);
            const left = Number.isFinite(x) ? Math.min(Math.max(x, 0), 1) : 0.7;
            const top = Number.isFinite(y) ? Math.min(Math.max(y, 0), 1) : 0.2;
            const icon = kind === "meeting" ? "📹" : "💬";
            const label = i18n.t(
                kind === "meeting"
                    ? "module.study.classes.open_meeting"
                    : "module.study.classes.open_chat",
            );
            const className =
                kind === "meeting"
                    ? "classes-open-meeting-btn"
                    : "classes-open-chat-btn";
            return `<button type="button"
                        class="classes-board-entity ${className}"
                        data-entity-kind="${escapeHtml(kind)}"
                        draggable="true"
                        style="left:${left * 100}%;top:${top * 100}%"
                        aria-label="${escapeHtml(label)}"
                        title="${escapeHtml(label)}">${icon}</button>`;
        })
        .join("");
    const toolbarActions = [];
    if (isTeacherView) {
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-board-entity-token classes-open-chat-btn"
                ${snapshot?.chatUrl ? "" : "disabled"}
                data-entity-kind="chat"
                draggable="true"
                aria-label="${escapeHtml(i18n.t("module.study.classes.open_chat"))}"
                title="${escapeHtml(i18n.t("module.study.classes.open_chat"))}">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>`,
        );
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-class-settings-btn"
                aria-label="${escapeHtml(i18n.t("module.study.classes.class_settings"))}"
                title="${escapeHtml(i18n.t("module.study.classes.class_settings"))}">${escapeHtml(i18n.t("module.study.classes.class_settings"))}</button>`,
        );
    }
    if (canToggleView) {
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-toggle-view-btn"
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
                )}">${escapeHtml(
                    i18n.t(
                        currentViewMode === "teacher"
                            ? "module.study.classes.enter_student_view"
                            : "module.study.classes.enter_teacher_view",
                    ),
                )}</button>`,
        );
    }
    if (workspaceMode !== "notepad") {
        toolbarActions.unshift(
            renderTileLayoutToggleButton({
                i18n,
                tileLayout,
            }),
        );
    }
    const collapsed = !blackboardExpanded && !isMeetingOpen;
    return `
        <div class="classes-blackboard${collapsed ? " classes-blackboard--collapsed" : ""}" role="region" aria-label="${escapeHtml(i18n.t("module.study.classes.classroom_blackboard"))}">
            <div class="classes-blackboard-header">
                <div class="classes-chalk-header classes-workspace-tabs${isTeacherPresent ? " classes-teacher-locked" : ""}">${renderWorkspaceTabs(
                    {
                        i18n,
                        workspaceMode,
                        isMeetingOpen,
                        hasActiveMeeting,
                        isTeacherView,
                        hasChat: Boolean(
                            String(snapshot?.chatUrl ?? "").trim(),
                        ),
                        canAccessWhiteboard:
                            isTeacherView ||
                            Boolean(activeWhiteboardId) ||
                            Boolean(activeWhiteboard?.embedUrl),
                    },
                )}</div>
                ${
                    toolbarActions.length
                        ? `<div class="classes-blackboard-actions">${toolbarActions.join("")}</div>`
                        : ""
                }
            </div>
            <div class="classes-blackboard-surface">
                <div class="classes-blackboard-body">
                    ${renderSidebarPanel({
                        classResources,
                        activeMaterialKey,
                        snapshot,
                        isTeacherView,
                        i18n,
                    })}
                    <div class="classes-workspace-main">
                        ${renderWorkspaceContent({
                            snapshot,
                            classResources,
                            selectedSeatNumber,
                            selectedNotebookText,
                            i18n,
                            isTeacherView,
                            workspaceMode,
                            activeWhiteboard,
                            initializedTiles,
                            isMeetingOpen,
                            tileLayout,
                            tileOrder,
                        })}
                    </div>
                </div>
                <div class="classes-blackboard-entity-layer">${renderedEntities}</div>
            </div>
            <div class="classes-blackboard-ledge"></div>
        </div>
    `;
}

function renderDeskUnit({ seatNumber, member, selected, isTeacherView, i18n }) {
    const occupied = Boolean(member);
    const emptySeatLabel = i18n.t(
        isTeacherView
            ? "module.study.classes.invite_student"
            : "module.study.classes.empty_seat",
    );
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
             ${isTeacherView && occupied ? 'draggable="true"' : ""}>
            <div class="classes-desk-surface">
                ${occupied ? renderDeskAvatar(member) : `<span class="classes-desk-badge" aria-hidden="true">${escapeHtml(i18n.t("module.study.classes.classroom_seat"))} ${seatNumber + 1}</span>`}
            </div>
            <div class="classes-desk-nameplate">
                <span class="classes-status-light classes-status-light--${escapeHtml(
                    String(member?.presence ?? "offline"),
                )}"></span>
                ${
                    occupied
                        ? `<span class="classes-desk-name">${escapeHtml(member?.identityMasked ? "???" : buildAccountLabel(member))}</span>`
                        : `<span class="classes-desk-name">${escapeHtml(emptySeatLabel)}</span>`
                }
            </div>
            <div class="classes-chair-element"></div>
        </div>
    `;
}

export function renderDeskFloor({
    snapshot,
    selectedSeatNumber,
    i18n,
    isTeacherView,
}) {
    const rawLimit = Number(snapshot?.classroom?.studentLimit);
    const studentLimit =
        Number.isInteger(rawLimit) && rawLimit > 0
            ? rawLimit
            : DEFAULT_STUDENT_CAPACITY;
    const seatAssignments = normalizeSeatAssignments(
        snapshot?.classroom?.seatAssignments,
    );
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const membersBySeat = new Map();
    const unassignedMembers = [];
    for (const member of members) {
        const accountId = String(member?.studentAccountId ?? "").trim();
        if (!accountId) continue;
        const seat = Number(seatAssignments[accountId]);
        if (Number.isInteger(seat) && seat >= 0) {
            membersBySeat.set(seat, member);
            continue;
        }
        unassignedMembers.push(member);
    }
    if (unassignedMembers.length) {
        let nextUnassignedIndex = 0;
        for (let seat = 0; seat < studentLimit; seat++) {
            if (membersBySeat.has(seat)) continue;
            const nextMember = unassignedMembers[nextUnassignedIndex++];
            if (!nextMember) break;
            membersBySeat.set(seat, nextMember);
        }
    }
    const { desksPerRow, rowCount } = computeDeskLayout(studentLimit);
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
                    selected:
                        selectedSeatNumber != null &&
                        Number(selectedSeatNumber) === seatNum,
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
    const teacherLabel =
        buildAccountLabel(
            snapshot?.teacher ?? {
                studentAccountId: snapshot?.teacherAccountId,
            },
        ) || i18n.t("ui.reuse.teacher");
    const teacherDesk = snapshot?.teacherAccountId
        ? `<div class="classes-teacher-desk-zone">
                <div class="classes-desk-unit classes-desk-unit--teacher">
                    <div class="classes-desk-surface">${renderDeskAvatar({
                        ...snapshot?.teacher,
                        studentAccountId: snapshot?.teacherAccountId,
                        displayName: teacherLabel,
                    })}</div>
                    <div class="classes-desk-nameplate">
                        <span class="classes-status-light classes-status-light--online"></span>
                        <span class="classes-desk-name">${escapeHtml(teacherLabel)}</span>
                    </div>
                    <div class="classes-chair-element"></div>
                </div>
            </div>`
        : "";
    return `<div class="classes-desk-floor">${teacherDesk}${rowHtml}${renderRoomDoor({ i18n, isTeacherView })}</div>`;
}

function renderRoomDoor({ i18n, isTeacherView }) {
    return `
        <div class="classes-room-doorwall">
            <div class="classes-room-door" id="study-classroom-door"
                 role="button" tabindex="0"
                 title="${escapeHtml(i18n.t(isTeacherView ? "module.study.classes.disband_class_action" : "module.study.classes.leave_class"))}">
                <div class="classes-door-panel"></div>
            </div>
        </div>
    `;
}

function renderMaterialsEditor({ classResources, i18n }) {
    const files = Array.isArray(classResources.files)
        ? classResources.files
        : [];
    const fileItems = files
        .map(
            (fileRef, index) => `
                <li class="classes-materials-file-item" data-file-index="${index}">
                    <span class="classes-materials-file-name">${escapeHtml(String(fileRef?.name ?? ""))}</span>
                    <button type="button" class="classes-materials-file-remove" data-file-index="${index}" aria-label="${escapeHtml(i18n.t("module.study.classes.materials_file_remove"))}">&times;</button>
                </li>
            `,
        )
        .join("");
    return `
        <details class="classes-materials-editor">
            <summary class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</summary>
            <div class="classes-materials-editor-body">
                <label class="classes-section-heading" for="classes-materials">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</label>
                <textarea id="classes-materials" class="classes-classroom-editor">${escapeHtml(classResources.materials ?? "")}</textarea>
                <label class="classes-section-heading" for="classes-homework">${escapeHtml(i18n.t("module.study.classes.assigned_homework"))}</label>
                <textarea id="classes-homework" class="classes-classroom-editor">${escapeHtml(classResources.homework ?? "")}</textarea>
                ${
                    files.length
                        ? `<ul class="classes-materials-file-list">${fileItems}</ul>`
                        : ""
                }
                <label class="classes-materials-upload-label">
                    ${escapeHtml(i18n.t("module.study.classes.materials_upload"))}
                    <input type="file" class="classes-materials-upload-input" style="display:none" multiple>
                </label>
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

function renderWhiteboardList({ whiteboards, isTeacherView, i18n }) {
    if (!whiteboards || !whiteboards.length) {
        return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_whiteboards"))}</p>`;
    }
    const items = whiteboards
        .map(
            (board) => `
            <li class="classes-whiteboard-item">
                <span class="classes-whiteboard-name">${escapeHtml(String(board.name ?? ""))}</span>
                <button type="button" class="btn-confirm btn-animated classes-open-whiteboard-btn"
                    data-board-id="${escapeHtml(String(board.id))}"
                    data-board-name="${escapeHtml(String(board.name ?? ""))}">${escapeHtml(i18n.t("ui.reuse.open"))}</button>
                <button type="button" class="btn-cancel btn-animated classes-popout-whiteboard-btn"
                    data-board-id="${escapeHtml(String(board.id))}"
                    data-board-name="${escapeHtml(String(board.name ?? ""))}">${escapeHtml(i18n.t("ui.reuse.pop_out"))}</button>
                ${
                    isTeacherView
                        ? `<button type="button" class="btn-cancel btn-animated classes-delete-whiteboard-btn"
                            data-board-id="${escapeHtml(String(board.id))}"
                            data-board-name="${escapeHtml(String(board.name ?? ""))}">${escapeHtml(i18n.t("ui.reuse.delete"))}</button>`
                        : ""
                }
            </li>
        `,
        )
        .join("");
    return `<ul class="classes-whiteboard-list">${items}</ul>`;
}

function renderClassroomView({
    snapshot,
    classResources,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
    isTeacherView,
    availableClasses,
    selectedLanguageFilter,
    searchQuery,
    canToggleView,
    currentViewMode,
    canEditMaterials,
    boardEntities,
    workspaceMode,
    sidebarMode,
    activeMaterialKey,
    whiteboards,
    activeWhiteboard,
    activeWhiteboardId,
    hasActiveMeeting,
    isChatOpen,
    isMeetingOpen,
    blackboardExpanded,
    initializedTiles,
    tileLayout = "stacked",
    tileOrder = [],
    isTeacherPresent = false,
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
                    ${renderBlackboard({
                        snapshot: { ...snapshot, isTeacherView },
                        classResources,
                        selectedSeatNumber,
                        selectedNotebookText,
                        i18n,
                        isTeacherView,
                        canToggleView,
                        currentViewMode,
                        boardEntities,
                        workspaceMode,
                        sidebarMode,
                        activeMaterialKey,
                        whiteboards,
                        activeWhiteboard,
                        activeWhiteboardId,
                        hasActiveMeeting,
                        isChatOpen,
                        isMeetingOpen,
                        blackboardExpanded,
                        initializedTiles,
                        tileLayout,
                        tileOrder,
                        isTeacherPresent,
                    })}
                </div>
                ${renderDeskFloor({ snapshot, selectedSeatNumber, i18n, isTeacherView })}
            </div>
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
