import { escapeHtml } from "/static/reuse/escape-html.js";
import { buildProfileAvatarMarkup } from "/static/gateways/social/reuse/profile-avatar.js";

const DEFAULT_STUDENT_CAPACITY = 20;

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

function renderWorkspaceTabs({
    i18n,
    workspaceMode,
    isMeetingOpen,
    canAccessWhiteboard,
}) {
    const tabs = [
        {
            mode: "agenda",
            label: i18n.t("module.study.classes.class_agenda"),
        },
        {
            mode: "roster",
            label: i18n.t("module.study.classes.students_section"),
        },
        {
            mode: "notepad",
            label: i18n.t("module.study.classes.notepad"),
        },
    ];
    if (canAccessWhiteboard) {
        tabs.push({
            mode: "whiteboard",
            label: i18n.t("module.study.classes.whiteboards"),
        });
    }
    if (isMeetingOpen) {
        tabs.push({
            mode: "meeting",
            label: i18n.t("ui.reuse.meeting"),
        });
    }
    return tabs
        .map(
            (tab) => `<button
                    type="button"
                    class="classes-workspace-tab-btn${
                        workspaceMode === tab.mode ? " active" : ""
                    }"
                    data-workspace-mode="${escapeHtml(tab.mode)}"
                    ${
                        isMeetingOpen && tab.mode !== "meeting"
                            ? 'disabled aria-disabled="true"'
                            : ""
                    }
                >${escapeHtml(tab.label)}</button>`,
        )
        .join("");
}

function renderWorkspaceWhiteboard({
    whiteboards,
    activeWhiteboard,
    isTeacherView,
    i18n,
}) {
    if (!activeWhiteboard?.embedUrl) {
        return `
            <section class="classes-workspace-panel classes-workspace-panel--whiteboard">
                ${renderWhiteboardList({ whiteboards, isTeacherView, i18n })}
                ${
                    isTeacherView
                        ? `<button type="button" class="btn-confirm btn-animated classes-create-whiteboard-btn">${escapeHtml(i18n.t("module.study.classes.new_whiteboard"))}</button>`
                        : ""
                }
            </section>
        `;
    }
    return `
        <section class="classes-workspace-panel classes-workspace-panel--whiteboard">
            <div class="classes-inline-whiteboard-header">
                <span class="classes-inline-whiteboard-title">${escapeHtml(activeWhiteboard.boardName || i18n.t("module.study.classes.whiteboard"))}</span>
                <div class="classes-inline-whiteboard-actions">
                    <button type="button" class="classes-inline-whiteboard-popout-btn">${escapeHtml(i18n.t("ui.reuse.pop_out"))}</button>
                    <button type="button" class="classes-inline-whiteboard-close-btn">${escapeHtml(i18n.t("ui.reuse.close"))}</button>
                </div>
            </div>
            <iframe
                class="classes-inline-whiteboard-frame"
                src="${escapeHtml(activeWhiteboard.embedUrl)}"
                loading="eager"
                allow="clipboard-read; clipboard-write"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                title="${escapeHtml(activeWhiteboard.boardName || i18n.t("module.study.classes.whiteboard"))}"
            ></iframe>
        </section>
    `;
}

function renderWorkspaceContent({
    snapshot,
    activeAgendaItems,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
    isTeacherView,
    workspaceMode,
    whiteboards,
    activeWhiteboard,
    isMeetingOpen,
}) {
    if (workspaceMode === "meeting") {
        return `<section class="classes-workspace-panel classes-workspace-panel--meeting"><div class="classes-meeting-workspace-host"></div></section>`;
    }
    if (workspaceMode === "chat") {
        return `<section class="classes-workspace-panel classes-workspace-panel--chat"><div class="classes-chat-workspace-host"></div></section>`;
    }
    if (workspaceMode === "roster") {
        return `<section class="classes-workspace-panel classes-workspace-panel--roster classes-workspace-roster">${renderStudentRoster({ snapshot, i18n })}</section>`;
    }
    if (workspaceMode === "notepad") {
        return '<section class="classes-workspace-panel classes-workspace-panel--notepad"><div class="classes-notepad-host"></div></section>';
    }
    if (workspaceMode === "whiteboard") {
        return renderWorkspaceWhiteboard({
            whiteboards,
            activeWhiteboard,
            isTeacherView,
            i18n,
        });
    }
    return `
        <section class="classes-workspace-panel classes-workspace-panel--agenda">
            ${renderChalkAgenda({ activeAgendaItems, i18n })}
            ${renderSelectedDeskPanel({
                snapshot,
                selectedSeatNumber,
                selectedNotebookText,
                i18n,
            })}
        </section>
    `;
}

function renderPresenceList({ snapshot, i18n }) {
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const memberLabel = (member) =>
        buildAccountLabel(member) || String(member?.studentAccountId ?? "");
    const present = members.filter(
        (member) =>
            String(member?.presence ?? "") === "online" ||
            String(member?.presence ?? "") === "away",
    );
    const absent = members.filter(
        (member) =>
            String(member?.presence ?? "") === "offline" || !member?.presence,
    );

    const presentItems = present
        .map(
            (member) =>
                `<li class="classes-presence-item">${escapeHtml(memberLabel(member))}</li>`,
        )
        .join("");
    const absentItems = absent
        .map(
            (member) =>
                `<li class="classes-presence-item classes-presence-item--absent">${escapeHtml(memberLabel(member))}</li>`,
        )
        .join("");

    return `
        <div class="classes-live-rail-header">${escapeHtml(i18n.t("module.study.classes.students_section"))}</div>
        <ul class="classes-presence-list">
            <li class="classes-presence-list-label">${escapeHtml(i18n.t("module.study.classes.members_present"))}</li>
            ${presentItems || `<li class="classes-presence-item classes-presence-item--absent">&#8212;</li>`}
            <li class="classes-presence-list-label">${escapeHtml(i18n.t("module.study.classes.members_absent"))}</li>
            ${absentItems || `<li class="classes-presence-item classes-presence-item--absent">&#8212;</li>`}
        </ul>
    `;
}

function renderLiveRail({
    snapshot,
    i18n,
    isTeacherView,
    whiteboards,
    activeWhiteboard,
    activeWhiteboardId,
    hasActiveMeeting,
    isChatOpen,
    isMeetingOpen,
}) {
    const canAccessWhiteboard =
        isTeacherView ||
        Boolean(activeWhiteboardId) ||
        Boolean(activeWhiteboard?.embedUrl);
    const activeWhiteboardSummary =
        activeWhiteboard?.boardName ??
        whiteboards.find(
            (board) =>
                String(board?.id ?? "") === String(activeWhiteboardId ?? ""),
        )?.name ??
        "";
    return `
        <aside class="classes-live-rail">
            <section class="classes-live-rail-card">
                <div class="classes-live-rail-body classes-live-rail-roster">
                    ${renderPresenceList({ snapshot, i18n })}
                </div>
            </section>
            ${
                isTeacherView
                    ? `<section class="classes-live-rail-card">
                <div class="classes-live-rail-header">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</div>
                <div class="classes-live-rail-body">
                    <button
                        type="button"
                        class="classes-live-rail-action classes-open-chat-btn"
                        ${snapshot?.chatUrl ? "" : "disabled"}
                        aria-pressed="${isChatOpen ? "true" : "false"}"
                    >${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>
                </div>
            </section>
            <section class="classes-live-rail-card">
                <div class="classes-live-rail-header">${escapeHtml(i18n.t("ui.reuse.meeting"))}</div>
                <div class="classes-live-rail-body">
                    <button
                        type="button"
                        class="classes-live-rail-action classes-open-meeting-btn"
                        ${isMeetingOpen ? 'aria-pressed="true"' : ""}
                    >${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</button>
                </div>
            </section>`
                    : ""
            }
            ${
                canAccessWhiteboard
                    ? `<section class="classes-live-rail-card">
                <div class="classes-live-rail-header">${escapeHtml(i18n.t("module.study.classes.whiteboards"))}</div>
                <div class="classes-live-rail-body">
                    ${
                        activeWhiteboardSummary
                            ? `<div class="classes-live-rail-summary">${escapeHtml(activeWhiteboardSummary)}</div>`
                            : ""
                    }
                    <button
                        type="button"
                        class="classes-live-rail-action classes-open-whiteboards-btn"
                        ${isMeetingOpen ? 'disabled aria-disabled="true"' : ""}
                    >${escapeHtml(i18n.t("module.study.classes.whiteboards"))}</button>
                    ${
                        isTeacherView && !whiteboards?.length
                            ? `<button type="button" class="btn-confirm btn-animated classes-create-whiteboard-btn">${escapeHtml(i18n.t("module.study.classes.new_whiteboard"))}</button>`
                            : ""
                    }
                </div>
            </section>`
                    : ""
            }
        </aside>
    `;
}

export function renderBlackboard({
    snapshot,
    activeAgendaItems,
    selectedSeatNumber,
    selectedNotebookText,
    i18n,
    isTeacherView,
    canToggleView,
    currentViewMode,
    boardEntities,
    workspaceMode,
    whiteboards,
    activeWhiteboard,
    activeWhiteboardId,
    hasActiveMeeting,
    isChatOpen,
    isMeetingOpen,
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
            `<button type="button" class="classes-icon-btn classes-open-whiteboards-btn"
                ${isMeetingOpen ? 'disabled aria-disabled="true"' : ""}
                aria-label="${escapeHtml(i18n.t("module.study.classes.whiteboards"))}"
                title="${escapeHtml(i18n.t("module.study.classes.whiteboards"))}">${escapeHtml(i18n.t("module.study.classes.whiteboards"))}</button>`,
        );
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-board-entity-token classes-open-chat-btn"
                ${snapshot?.chatUrl ? "" : "disabled"}
                data-entity-kind="chat"
                draggable="true"
                aria-label="${escapeHtml(i18n.t("module.study.classes.open_chat"))}"
                title="${escapeHtml(i18n.t("module.study.classes.open_chat"))}">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>`,
        );
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-board-entity-token classes-open-meeting-btn"
                data-entity-kind="meeting"
                draggable="true"
                aria-label="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}"
                title="${escapeHtml(i18n.t("module.study.classes.open_meeting"))}">${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</button>`,
        );
        toolbarActions.push(
            `<button type="button" class="classes-icon-btn classes-create-agenda-btn"
                aria-label="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}"
                title="${escapeHtml(i18n.t("module.study.classes.create_agenda"))}">${escapeHtml(i18n.t("module.study.classes.create_agenda"))}</button>`,
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
    toolbarActions.push(
        `<button type="button" class="classes-icon-btn classes-toggle-notepad-btn"
            aria-label="${escapeHtml(i18n.t("module.study.classes.notepad"))}"
            ${isMeetingOpen ? 'disabled aria-disabled="true"' : ""}
            title="${escapeHtml(i18n.t("module.study.classes.notepad"))}">${escapeHtml(i18n.t("module.study.classes.notepad"))}</button>`,
    );
    const showBlackboardHeader = isTeacherView || canToggleView;
    return `
        <div class="classes-blackboard" role="region" aria-label="${escapeHtml(i18n.t("module.study.classes.classroom_blackboard"))}">
            ${
                showBlackboardHeader
                    ? `<div class="classes-blackboard-header">
                <div class="classes-chalk-header classes-workspace-tabs">${renderWorkspaceTabs(
                    {
                        i18n,
                        workspaceMode,
                        isMeetingOpen,
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
            </div>`
                    : ""
            }
            <div class="classes-blackboard-surface">
                <div class="classes-workspace-shell">
                    <div class="classes-workspace-main">
                        ${renderWorkspaceContent({
                            snapshot,
                            activeAgendaItems,
                            selectedSeatNumber,
                            selectedNotebookText,
                            i18n,
                            isTeacherView,
                            workspaceMode,
                            whiteboards,
                            activeWhiteboard,
                            isMeetingOpen,
                        })}
                    </div>
                    ${renderLiveRail({
                        snapshot,
                        i18n,
                        isTeacherView,
                        whiteboards,
                        activeWhiteboard,
                        activeWhiteboardId,
                        hasActiveMeeting,
                        isChatOpen,
                        isMeetingOpen,
                    })}
                </div>
                <div class="classes-blackboard-entity-layer">${renderedEntities}</div>
            </div>
            <div class="classes-blackboard-ledge"></div>
        </div>
    `;
}

function renderRosterItem(member) {
    const accountId = String(member?.studentAccountId ?? "").trim();
    const handle = String(member?.handle ?? "").trim();
    const label = member?.identityMasked
        ? "???"
        : buildAccountLabel(member) || accountId;
    const presenceClass = String(member?.presence ?? "offline")
        .trim()
        .toLowerCase();
    const avatar = member?.identityMasked
        ? `<span class="classes-roster-avatar">${escapeHtml("???")}</span>`
        : buildProfileAvatarMarkup({
              avatarKey: member?.avatarKey ?? null,
              label,
              colorSeed: member?.handle || accountId,
              avatarClass: "classes-roster-avatar",
              imageClass: "classes-roster-avatar-img",
              fallbackClass: "classes-roster-avatar-fallback",
              profileHandle: handle || null,
              linkClass: "classes-profile-preview-link",
          });
    const content = `
        <span class="classes-roster-member-card">
            ${avatar}
            <span class="classes-roster-details">
                <span class="classes-roster-name">${escapeHtml(label)}</span>
                ${
                    member?.rosterRoleLabel
                        ? `<span class="classes-roster-role">${escapeHtml(member.rosterRoleLabel)}</span>`
                        : ""
                }
            </span>
            <span class="classes-status-light classes-status-light--${escapeHtml(presenceClass)}" aria-hidden="true"></span>
        </span>
    `;
    if (!handle || member?.identityMasked) {
        return `<div class="classes-roster-item${escapeHtml(String(member?.rosterItemClass ?? ""))}" data-student-id="${escapeHtml(accountId)}">${content}</div>`;
    }
    return `<button type="button" class="classes-roster-item classes-member-profile-btn${escapeHtml(String(member?.rosterItemClass ?? ""))}" data-student-id="${escapeHtml(accountId)}" data-student-handle="${escapeHtml(handle)}" data-student-name="${escapeHtml(label)}" data-student-avatar-key="${escapeHtml(String(member?.avatarKey ?? ""))}">${content}</button>`;
}

function renderStudentRoster({ snapshot, i18n }) {
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const teacherAccountId = String(snapshot?.teacherAccountId ?? "").trim();
    let teacherRow = "";
    if (teacherAccountId) {
        const teacherMember = {
            ...(snapshot?.teacher ?? {}),
            studentAccountId: teacherAccountId,
            displayName:
                String(snapshot?.teacher?.displayName ?? "").trim() ||
                buildAccountLabel(snapshot?.teacher) ||
                teacherAccountId,
            rosterRoleLabel: i18n.t("module.study.classes.teacher"),
            rosterItemClass: " classes-roster-item--teacher",
        };
        teacherRow = renderRosterItem(teacherMember);
    }
    const rosterMembers = [...members];
    const studentRows = rosterMembers.map(renderRosterItem).join("");
    return `
        <div class="classes-student-roster">
            ${teacherRow}
            <div class="classes-roster-header">${escapeHtml(i18n.t("module.study.classes.students_section"))}</div>
            <div class="classes-roster-list classes-roster-grid">${studentRows || `<span class="classes-empty classes-empty--compact">${escapeHtml(i18n.t("module.study.classes.no_members"))}</span>`}</div>
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

export { renderDeskFloor, renderStudentRoster };

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
    const selectedMember = (snapshot.members ?? []).find(
        (member) =>
            Number(seatAssignments[String(member.studentAccountId ?? "")]) ===
            Number(selectedSeatNumber),
    );
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
    canEditMaterials,
    boardEntities,
    workspaceMode,
    whiteboards,
    activeWhiteboard,
    activeWhiteboardId,
    hasActiveMeeting,
    isChatOpen,
    isMeetingOpen,
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
                        activeAgendaItems,
                        selectedSeatNumber,
                        selectedNotebookText,
                        i18n,
                        isTeacherView,
                        canToggleView,
                        currentViewMode,
                        boardEntities,
                        workspaceMode,
                        whiteboards,
                        activeWhiteboard,
                        activeWhiteboardId,
                        hasActiveMeeting,
                        isChatOpen,
                        isMeetingOpen,
                    })}
                </div>
                ${renderDeskFloor({ snapshot, selectedSeatNumber, i18n, isTeacherView })}
            </div>
            ${canEditMaterials ? renderMaterialsEditor({ classResources, i18n }) : ""}
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
