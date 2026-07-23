import { escapeHtml } from "/static/reuse/escape-html.js";

export function renderCanvasElement({
    activeBoard,
    activeSession,
    boards,
    canManageShares,
    canRenameActiveBoard,
    preflightStatus,
    syncStatus,
    syncStatusMessage,
    translate,
    integrationCanvasMode = false,
}) {
    const hasActiveBoard = Boolean(activeBoard);
    const overlayHidden = hasActiveBoard && preflightStatus === "passed";
    const overlayMessage = hasActiveBoard
        ? translate("module.nextcloud_whiteboard.connecting_ellipsis")
        : translate("module.nextcloud_whiteboard.canvas_placeholder");
    const boardList = boards
        .map(
            (board) =>
                `<button type="button" class="whiteboard-overlay-board" data-board-id="${escapeHtml(board.id)}"><span class="whiteboard-overlay-board-title">${escapeHtml(board.title)}</span><span class="whiteboard-overlay-board-updated">${escapeHtml(new Date(board.updatedAt).toLocaleString())}</span></button>`,
        )
        .join("");
    const toolButton = (tool, labelKey, icon) =>
        `<button type="button" data-tool="${tool}" class="whiteboard-tool${tool === "select" ? " active" : ""}" title="${escapeHtml(translate(labelKey))}" aria-label="${escapeHtml(translate(labelKey))}">${icon}</button>`;

    return `
    <div class="whiteboard-canvas-wrap">
      <div id="whiteboard-toolbar" class="whiteboard-toolbar" role="toolbar" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.toolbar_label"))}">
        <div class="whiteboard-toolbar-group">
          ${integrationCanvasMode ? "" : `<button type="button" id="whiteboard-new" class="whiteboard-tool whiteboard-new-tool" title="${escapeHtml(translate("module.nextcloud_whiteboard.new_board"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.new_board"))}">＋ <span>New</span></button>`}
          <button type="button" id="whiteboard-history" class="whiteboard-tool" title="${escapeHtml(translate("module.nextcloud_whiteboard.history_title"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.history_title"))}">↺</button>
          ${hasActiveBoard ? `<button type="button" id="whiteboard-tool-lock" class="whiteboard-tool" aria-pressed="false" title="${escapeHtml(translate("module.nextcloud_whiteboard.tool_lock"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.tool_lock"))}">🔒</button>` : ""}
        </div>
        <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
          ${toolButton("select", "module.nextcloud_whiteboard.tool_select", "🖱")}
          ${toolButton("pen", "module.nextcloud_whiteboard.tool_pen", "✎")}
          ${toolButton("rectangle", "module.nextcloud_whiteboard.tool_rectangle", "□")}
          ${toolButton("diamond", "module.nextcloud_whiteboard.tool_diamond", "◇")}
          ${toolButton("ellipse", "module.nextcloud_whiteboard.tool_ellipse", "○")}
          ${toolButton("arrow", "module.nextcloud_whiteboard.tool_arrow", "→")}
          ${toolButton("line", "module.nextcloud_whiteboard.tool_line", "−")}
          ${toolButton("text", "module.nextcloud_whiteboard.tool_text", "T")}
          ${toolButton("eraser", "module.nextcloud_whiteboard.tool_eraser", "⌫")}
        </div>
        <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
          <button type="button" id="whiteboard-undo" class="whiteboard-tool" title="${escapeHtml(translate("module.nextcloud_whiteboard.undo"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.undo"))}">↶</button>
          <button type="button" id="whiteboard-redo" class="whiteboard-tool" title="${escapeHtml(translate("module.nextcloud_whiteboard.redo"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.redo"))}">↷</button>
        </div>
        <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
          <input type="color" id="whiteboard-color" value="#111827" title="${escapeHtml(translate("module.nextcloud_whiteboard.stroke_color"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.stroke_color"))}" />
          <select id="whiteboard-stroke-width" class="whiteboard-tool theme-select" title="${escapeHtml(translate("module.nextcloud_whiteboard.stroke_width"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.stroke_width"))}">
            <option value="2">${escapeHtml(translate("module.nextcloud_whiteboard.stroke_thin"))}</option>
            <option value="4" selected>${escapeHtml(translate("module.nextcloud_whiteboard.stroke_medium"))}</option>
            <option value="8">${escapeHtml(translate("module.nextcloud_whiteboard.stroke_thick"))}</option>
          </select>
        </div>
        <div class="whiteboard-toolbar-group" ${hasActiveBoard ? "" : "hidden"}>
          ${canManageShares() ? '<span id="whiteboard-share-slot"></span>' : ""}
          <a href="#" id="whiteboard-clear" class="whiteboard-tool btn-cancel" role="button" title="${escapeHtml(translate("module.nextcloud_whiteboard.clear_board"))}" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.clear_board"))}">×</a>
        </div>
        ${integrationCanvasMode ? "" : `<span id="whiteboard-board-title" class="whiteboard-board-title" title="${escapeHtml(canRenameActiveBoard() ? translate("module.nextcloud_whiteboard.rename_hint") : "")}">${escapeHtml(activeSession?.title ?? activeBoard?.title ?? "")}</span>`}
        <span id="whiteboard-sync-status" class="whiteboard-sync-status" data-status="${escapeHtml(syncStatus)}" title="${escapeHtml(syncStatusMessage || translate("module.nextcloud_whiteboard.status_idle"))}"></span>
        <div id="page-presence-section" class="whiteboard-toolbar-group" aria-live="polite"></div>
      </div>
      <div class="whiteboard-canvas-stage">
        <canvas id="whiteboard-canvas" tabindex="0" aria-label="${escapeHtml(translate("module.nextcloud_whiteboard.canvas_label"))}"></canvas>
        <div id="whiteboard-canvas-overlay" class="whiteboard-canvas-overlay" ${overlayHidden ? "hidden" : ""} aria-live="polite">
          <div class="whiteboard-start-panel">
            <p class="whiteboard-overlay-message">${escapeHtml(overlayMessage)}</p>
            ${hasActiveBoard ? "" : `<div class="whiteboard-start-actions">${integrationCanvasMode ? "" : `<button type="button" id="whiteboard-start-new">${escapeHtml(translate("module.nextcloud_whiteboard.new_board"))}</button>`}<button type="button" id="whiteboard-start-history">${escapeHtml(translate("module.nextcloud_whiteboard.history_title"))}</button></div><div class="whiteboard-overlay-board-list">${boardList || `<p>${escapeHtml(translate("module.nextcloud_whiteboard.empty"))}</p>`}</div>`}
          </div>
        </div>
      </div>
    </div>`;
}
