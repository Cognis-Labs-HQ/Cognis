import { escapeHtml } from "/static/reuse/escape-html.js";
import { getMaterialIcon } from "/static/adapters/study/classes/classroom-resource-actions.js";

/**
 * @param {Set<string>} tiles
 * @param {boolean} isMeetingOpen
 * @returns {boolean}
 */
function shouldShowMeetingTile(tiles, isMeetingOpen) {
    return tiles.has("meeting") || Boolean(isMeetingOpen);
}

/** @param {unknown} rawSeatAssignments */
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

export function renderWorkspaceTabs({
    i18n,
    workspaceMode,
    isMeetingOpen,
    hasActiveMeeting,
    canAccessWhiteboard,
    isTeacherView,
}) {
    const tabs = [
        {
            mode: "agenda",
            label: i18n.t("module.study.classes.classroom_panel"),
            disabled: false,
        },
        {
            mode: "whiteboard",
            label: i18n.t("module.study.classes.whiteboard"),
            disabled: !canAccessWhiteboard,
        },
        {
            mode: "meeting",
            label: i18n.t("ui.reuse.meeting"),
            disabled: !isTeacherView && !isMeetingOpen && !hasActiveMeeting,
        },
    ];
    return tabs
        .map(
            (tab) => `<button
                    type="button"
                    class="classes-workspace-tab-btn${
                        workspaceMode === tab.mode ? " active" : ""
                    }${isMeetingOpen && tab.mode === "meeting" ? " classes-meeting-pulse" : ""}"
                    data-workspace-mode="${escapeHtml(tab.mode)}"
                    ${tab.disabled ? "disabled" : ""}
                >${escapeHtml(tab.label)}</button>`,
        )
        .join("");
}

function renderWorkspaceWhiteboard({ activeWhiteboard, i18n }) {
    if (!activeWhiteboard?.embedUrl) {
        return `
            <section class="classes-workspace-panel classes-workspace-panel--whiteboard">
                <p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_whiteboards"))}</p>
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
                sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                title="${escapeHtml(activeWhiteboard.boardName || i18n.t("module.study.classes.whiteboard"))}"
            ></iframe>
        </section>
    `;
}

function renderAgendaDocumentPanel({
    classResources,
    isTeacherView,
    i18n,
    compact = false,
}) {
    const agendaDocument = String(classResources?.agendaDocument ?? "");
    const snapshots = Array.isArray(classResources?.agendaSnapshots)
        ? classResources.agendaSnapshots
        : [];
    const snapshotOptions = snapshots
        .map((snapshot) => {
            const snapshotId = String(snapshot?.id ?? "").trim();
            const snapshotName = String(snapshot?.name ?? "").trim();
            if (!snapshotId || !snapshotName) {
                return "";
            }
            return `<option value="${escapeHtml(snapshotId)}">${escapeHtml(snapshotName)}</option>`;
        })
        .join("");
    return `
        <div class="classes-agenda-panel${compact ? " classes-agenda-panel--compact" : ""}">
            <textarea
                class="classes-agenda-document-editor"
                ${isTeacherView ? "" : "readonly"}
                placeholder="${escapeHtml(i18n.t("module.study.classes.class_agenda"))}"
            >${escapeHtml(agendaDocument)}</textarea>
            ${
                isTeacherView
                    ? `<div class="classes-agenda-document-actions">
                <button type="button" class="btn-confirm btn-animated classes-agenda-snapshot-save-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
                <select class="classes-agenda-snapshot-select">
                    <option value="">${escapeHtml(i18n.t("ui.reuse.open"))}</option>
                    ${snapshotOptions}
                </select>
                <button type="button" class="btn-cancel btn-animated classes-agenda-snapshot-open-btn">${escapeHtml(i18n.t("ui.reuse.open"))}</button>
            </div>`
                    : ""
            }
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
            <label class="classes-section-heading" for="classes-own-notebook">${escapeHtml(i18n.t("module.study.classes.my_notebook"))}</label>
            <textarea id="classes-own-notebook" class="classes-notebook-editor">${escapeHtml(selectedNotebookText)}</textarea>
            <button type="button" class="btn-confirm btn-animated classes-save-notebook-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
        </div>
    `;
}

export function renderWorkspaceContent({
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
}) {
    if (workspaceMode === "chat") {
        return `<section class="classes-workspace-panel classes-workspace-panel--chat"><div class="classes-chat-workspace-host"></div></section>`;
    }
    if (workspaceMode === "notepad") {
        return `
            <section class="classes-workspace-panel classes-workspace-panel--notepad">
                <div class="classes-notepad-toolbar">
                    <button type="button" class="classes-notepad-save-file-btn">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
                    <button type="button" class="classes-notepad-open-file-btn">${escapeHtml(i18n.t("ui.reuse.open"))}</button>
                </div>
                <div class="classes-notepad-host"></div>
            </section>
        `;
    }
    const activeTileMode =
        workspaceMode === "whiteboard" || workspaceMode === "meeting"
            ? workspaceMode
            : "agenda";
    const tiles =
        initializedTiles instanceof Set ? initializedTiles : new Set();
    const whiteboardTile = tiles.has("whiteboard")
        ? `
                <section class="classes-workspace-tile classes-workspace-tile--whiteboard${
                    activeTileMode === "whiteboard" ? " active" : ""
                }" data-workspace-mode="whiteboard">
                    <button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="whiteboard">${escapeHtml(i18n.t("module.study.classes.whiteboard"))}</button>
                    <div class="classes-workspace-tile-content classes-whiteboard-workspace-host">
                        ${
                            activeWhiteboard?.embedUrl
                                ? ""
                                : `<p class="classes-empty classes-workspace-tile-empty">${escapeHtml(i18n.t("module.study.classes.no_whiteboards"))}</p>`
                        }
                    </div>
                </section>`
        : "";
    const showMeetingTile = shouldShowMeetingTile(tiles, isMeetingOpen);
    const meetingTile = showMeetingTile
        ? `
                <section class="classes-workspace-tile classes-workspace-tile--meeting${
                    activeTileMode === "meeting" ? " active" : ""
                }${isMeetingOpen ? " classes-meeting-pulse" : ""}" data-workspace-mode="meeting">
                    <button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="meeting">${escapeHtml(i18n.t("ui.reuse.meeting"))}</button>
                    <div class="classes-workspace-tile-content classes-meeting-workspace-host"></div>
                </section>`
        : "";
    return `
        <section class="classes-workspace-panel classes-workspace-panel--tiled">
            <div class="classes-workspace-tiles" data-active-workspace-mode="${escapeHtml(activeTileMode)}">
                <section class="classes-workspace-tile classes-workspace-tile--agenda${
                    activeTileMode === "agenda" ? " active" : ""
                }" data-workspace-mode="agenda">
                    <button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="agenda">${escapeHtml(i18n.t("module.study.classes.classroom_panel"))}</button>
                    <div class="classes-workspace-tile-content">
                        ${renderAgendaDocumentPanel({
                            classResources,
                            isTeacherView,
                            i18n,
                            compact: true,
                        })}
                        ${renderSelectedDeskPanel({
                            snapshot,
                            selectedSeatNumber,
                            selectedNotebookText,
                            i18n,
                        })}
                    </div>
                </section>
                ${whiteboardTile}
                ${meetingTile}
            </div>
        </section>
    `;
}

export function renderRosterPanel({ snapshot, i18n }) {
    const members = Array.isArray(snapshot?.members) ? snapshot.members : [];
    const memberLabel = (member) =>
        buildAccountLabel(member) || String(member?.studentAccountId ?? "");
    const emptySlot = `<div class="classes-roster-panel-item classes-roster-panel-item--absent">&#8212;</div>`;
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
                `<div class="classes-roster-panel-item">${escapeHtml(memberLabel(member))}</div>`,
        )
        .join("");
    const absentItems = absent
        .map(
            (member) =>
                `<div class="classes-roster-panel-item classes-roster-panel-item--absent">${escapeHtml(memberLabel(member))}</div>`,
        )
        .join("");

    return `
        <div class="classes-roster-panel">
            <div class="classes-roster-panel-columns">
                <div class="classes-roster-panel-column">
                    <div class="classes-roster-panel-label">${escapeHtml(i18n.t("module.study.classes.members_present"))}</div>
                    ${presentItems || emptySlot}
                </div>
                <div class="classes-roster-panel-column">
                    <div class="classes-roster-panel-label">${escapeHtml(i18n.t("module.study.classes.members_absent"))}</div>
                    ${absentItems || emptySlot}
                </div>
            </div>
        </div>
    `;
}

function renderSidebarMaterials({
    classResources,
    activeMaterialKey,
    isTeacherView,
    i18n,
}) {
    const files = Array.isArray(classResources?.files)
        ? classResources.files
        : [];
    if (activeMaterialKey) {
        const fileRef = files.find(
            (ref) => String(ref?.key ?? "").trim() === activeMaterialKey,
        );
        const fileName = fileRef
            ? String(fileRef.name ?? "").trim()
            : (activeMaterialKey.split("/").pop() ?? "");
        const fileUrl = `/api/v1/files/${activeMaterialKey}`;
        const extension =
            activeMaterialKey.split(".").pop()?.toLowerCase() ?? "";
        const isImage = ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
            extension,
        );
        const isPdf = extension === "pdf";
        let mediaMarkup;
        if (isImage) {
            mediaMarkup = `<img class="classes-material-viewer-image" src="${escapeHtml(fileUrl)}" alt="${escapeHtml(fileName)}">`;
        } else if (isPdf) {
            mediaMarkup = `<embed class="classes-material-viewer-embed" src="${escapeHtml(fileUrl)}" type="application/pdf" title="${escapeHtml(fileName)}">`;
        } else {
            mediaMarkup = `
                <div class="classes-material-viewer-download-wrap">
                    <span class="classes-material-viewer-file-icon">${getMaterialIcon(extension)}</span>
                    <span class="classes-material-viewer-file-name">${escapeHtml(fileName)}</span>
                    <a href="${escapeHtml(fileUrl)}" download="${escapeHtml(fileName)}" class="classes-material-download-btn btn-confirm btn-animated">
                        ${escapeHtml(i18n.t("module.study.classes.material_download"))}
                    </a>
                </div>
            `;
        }
        return `
            <div class="classes-sidebar-panel classes-sidebar-panel--materials classes-sidebar-panel--viewer">
                <div class="classes-material-viewer-header">
                    <button type="button" class="classes-material-viewer-back">
                        &#8592; ${escapeHtml(i18n.t("module.study.classes.material_viewer_back"))}
                    </button>
                    <span class="classes-material-viewer-title" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</span>
                </div>
                <div class="classes-material-viewer-body">${mediaMarkup}</div>
            </div>
        `;
    }
    const tilesMarkup = files
        .map((fileRef, index) => {
            const fileName = String(fileRef?.name ?? "").trim();
            const fileKey = String(fileRef?.key ?? "").trim();
            if (!fileName || !fileKey) return "";
            const extension = fileKey.split(".").pop()?.toLowerCase() ?? "";
            const icon = getMaterialIcon(extension);
            return `<div class="classes-material-tile-row">
                <button
                    type="button"
                    class="classes-material-tile"
                    data-material-key="${escapeHtml(fileKey)}"
                    data-material-name="${escapeHtml(fileName)}"
                    title="${escapeHtml(fileName)}"
                >
                    <span class="classes-material-tile-icon">${icon}</span>
                    <span class="classes-material-tile-name">${escapeHtml(fileName)}</span>
                </button>
                ${
                    isTeacherView
                        ? `<button type="button"
                            class="classes-material-unlink-btn"
                            data-material-index="${index}"
                            aria-label="${escapeHtml(i18n.t("ui.reuse.remove"))}"
                        >&times;</button>`
                        : ""
                }
            </div>`;
        })
        .join("");
    return `
        <div class="classes-sidebar-panel classes-sidebar-panel--materials">
            ${
                isTeacherView
                    ? `<button type="button" class="classes-icon-btn classes-material-add-btn">${escapeHtml(i18n.t("ui.reuse.add"))}</button>`
                    : ""
            }
            ${
                tilesMarkup
                    ? `<div class="classes-material-tiles">${tilesMarkup}</div>`
                    : `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.class_materials"))}</p>`
            }
        </div>
    `;
}

export function renderSidebarPanel({
    classResources,
    activeMaterialKey,
    snapshot,
    isTeacherView,
    i18n,
}) {
    return `
        <aside class="classes-sidebar-panel-wrap">
            <div class="classes-sidebar-students-section">
                <div class="classes-sidebar-section-label">${escapeHtml(i18n.t("module.study.classes.students_section"))}</div>
                ${renderRosterPanel({ snapshot, i18n })}
            </div>
            <div class="classes-sidebar-materials-section">
                ${renderSidebarMaterials({
                    classResources,
                    activeMaterialKey,
                    isTeacherView,
                    i18n,
                })}
            </div>
        </aside>
    `;
}
