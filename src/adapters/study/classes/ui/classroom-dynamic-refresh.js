import {
    renderDeskFloor,
    renderRosterPanel,
} from "/static/adapters/study/classes/classroom-render.js";
import { buildSlideNavButtonsHtml } from "/static/adapters/study/classes/classroom-render/workspace.js";
import { hydrateProfileAvatars } from "/static/gateways/social/reuse/profile-avatar.js";
import { escapeHtml } from "/static/reuse/escape-html.js";

/**
 * Returns a `refreshDynamicDom()` function that surgically updates only the
 * dynamic classroom elements (desk floor, blackboard member roster, board-panel
 * visibility) without replacing the whole .classes-classroom-content element.
 * Active meeting or chat overlay windows are therefore never disrupted.
 */
export function createDynamicDomRefresher({
    root,
    selectedSnapshot,
    getSelectedSeatNumber,
    i18n,
    isTeacherView,
}) {
    return function refreshDynamicDom() {
        const snapshot = selectedSnapshot();
        if (!snapshot) return;
        const selectedSeatNumber = getSelectedSeatNumber();

        // Re-render the desk floor (seats, presence, roster changes)
        const deskFloor = root.querySelector(".classes-desk-floor");
        if (deskFloor instanceof HTMLElement) {
            const tmpl = document.createElement("template");
            tmpl.innerHTML = renderDeskFloor({
                snapshot,
                selectedSeatNumber,
                i18n,
                isTeacherView: isTeacherView(),
            });
            const newFloor = tmpl.content.firstElementChild;
            if (newFloor) {
                deskFloor.replaceWith(newFloor);
            } else {
                console.warn(
                    "[classroom] renderDeskFloor returned no root element; skipping desk-floor replacement.",
                );
            }
        }

        const rosterPanelMarkup = renderRosterPanel({ snapshot, i18n });
        const rosterPanel = root.querySelector(".classes-roster-panel");
        if (rosterPanel instanceof HTMLElement) {
            rosterPanel.outerHTML = rosterPanelMarkup;
        }

        void hydrateProfileAvatars(root);
    };
}

/**
 * Returns a `refreshWorkspaceTilesOnly()` function that surgically updates
 * workspace tile active states and inserts newly initialized tiles without
 * touching the meeting iframe — preventing WebRTC session resets.
 */
export function createWorkspaceTileRefresher({
    root,
    getWorkspaceMode,
    getInitializedTiles,
    getTileOrder,
    getTileLayout,
    getIsMeetingOpen,
    getClassroomWindows,
    i18n,
    fallbackRefreshDom,
}) {
    function addTileContent(tile, mode) {
        if (tile.querySelector(".classes-workspace-tile-content")) return;
        const content = document.createElement("div");
        if (mode === "chat") {
            content.className = "classes-workspace-tile-content";
            const chatHost = document.createElement("div");
            chatHost.className = "classes-chat-workspace-host";
            content.appendChild(chatHost);
        } else if (mode === "whiteboard") {
            content.className =
                "classes-workspace-tile-content classes-whiteboard-workspace-host";
        }
        tile.appendChild(content);
    }

    function removeTileContent(tile) {
        const content = tile.querySelector(".classes-workspace-tile-content");
        if (!content) return;
        const blackboard = root.querySelector(".classes-blackboard");
        for (const panel of content.querySelectorAll(".classes-chat-panel")) {
            root.appendChild(panel);
        }
        if (blackboard) {
            for (const panel of content.querySelectorAll(
                ".classes-whiteboard-panel",
            )) {
                blackboard.appendChild(panel);
            }
        }
        content.remove();
    }

    return function refreshWorkspaceTilesOnly() {
        const tiledWorkspacePanel = root.querySelector(
            ".classes-workspace-panel--tiled",
        );
        const tilesContainer = root.querySelector(".classes-workspace-tiles");
        if (
            !(tiledWorkspacePanel instanceof HTMLElement) ||
            !(tilesContainer instanceof HTMLElement)
        ) {
            fallbackRefreshDom();
            return;
        }
        const workspaceMode = getWorkspaceMode();
        const initializedTiles = getInitializedTiles();
        const tileOrder = getTileOrder();
        const tileLayout = getTileLayout?.() ?? "stacked";
        const meetingOpen = Boolean(getIsMeetingOpen?.());
        const activeTileMode =
            workspaceMode === "chat" ||
            workspaceMode === "whiteboard" ||
            workspaceMode === "meeting"
                ? workspaceMode
                : "agenda";

        tilesContainer.classList.toggle(
            "classes-workspace-tiles--stacked",
            tileLayout === "stacked",
        );
        tilesContainer.classList.toggle(
            "classes-workspace-tiles--slideshow",
            tileLayout === "slideshow",
        );

        const layoutToggle = root.querySelector(
            ".classes-tile-layout-toggle-btn",
        );
        if (layoutToggle instanceof HTMLElement) {
            layoutToggle.dataset.tileLayout = tileLayout;
            layoutToggle.textContent =
                tileLayout === "stacked"
                    ? i18n.t("module.study.classes.slideshow_view")
                    : i18n.t("module.study.classes.tile_view");
        }

        const existingPrev = tiledWorkspacePanel.querySelector(
            ".classes-tile-nav-prev",
        );
        const existingNext = tiledWorkspacePanel.querySelector(
            ".classes-tile-nav-next",
        );
        if (tileLayout === "slideshow" && activeTileMode !== "chat") {
            const needsBuild =
                !(existingPrev instanceof HTMLButtonElement) ||
                !(existingNext instanceof HTMLButtonElement);
            if (needsBuild) {
                existingPrev?.remove();
                existingNext?.remove();
                const tmpl = document.createElement("template");
                tmpl.innerHTML = buildSlideNavButtonsHtml(i18n);
                for (const node of [...tmpl.content.children]) {
                    tiledWorkspacePanel.insertBefore(node, tilesContainer);
                }
            }
        } else {
            existingPrev?.remove();
            existingNext?.remove();
        }

        tilesContainer.dataset.activeWorkspaceMode = activeTileMode;
        const existingTiles = new Map();
        let contentDivChanged = false;
        for (const tile of tilesContainer.querySelectorAll(
            ".classes-workspace-tile[data-workspace-mode]",
        )) {
            const tileMode = String(tile.dataset.workspaceMode ?? "");
            existingTiles.set(tileMode, tile);
            const wasActive = tile.classList.contains("active");
            const isNowActive = tileMode === activeTileMode;
            tile.classList.toggle("active", isNowActive);
            const depth = tileOrder.indexOf(tileMode);
            tile.style.setProperty(
                "--tile-depth",
                String(depth >= 0 ? depth : tileOrder.length),
            );
            if (tileMode === "chat" || tileMode === "whiteboard") {
                if (!wasActive && isNowActive) {
                    addTileContent(tile, tileMode);
                    contentDivChanged = true;
                } else if (wasActive && !isNowActive) {
                    removeTileContent(tile);
                    contentDivChanged = true;
                }
            }
        }
        const orderedTiles = tileOrder
            .map((tileMode) => existingTiles.get(tileMode))
            .filter(Boolean);
        for (const tile of orderedTiles) {
            tilesContainer.appendChild(tile);
        }
        if (
            initializedTiles.has("chat") &&
            !tilesContainer.querySelector(".classes-workspace-tile--chat")
        ) {
            const depth = tileOrder.indexOf("chat");
            const chatSection = document.createElement("section");
            chatSection.className = `classes-workspace-tile classes-workspace-tile--chat${
                activeTileMode === "chat" ? " active" : ""
            }`;
            chatSection.dataset.workspaceMode = "chat";
            chatSection.style.setProperty(
                "--tile-depth",
                String(depth >= 0 ? depth : tileOrder.length - 1),
            );
            chatSection.innerHTML = `<button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="chat">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>`;
            if (activeTileMode === "chat") {
                const content = document.createElement("div");
                content.className = "classes-workspace-tile-content";
                const chatHost = document.createElement("div");
                chatHost.className = "classes-chat-workspace-host";
                content.appendChild(chatHost);
                chatSection.appendChild(content);
                contentDivChanged = true;
            }
            tilesContainer.appendChild(chatSection);
        }
        if (
            initializedTiles.has("whiteboard") &&
            !tilesContainer.querySelector(".classes-workspace-tile--whiteboard")
        ) {
            const depth = tileOrder.indexOf("whiteboard");
            const whiteboardSection = document.createElement("section");
            whiteboardSection.className = `classes-workspace-tile classes-workspace-tile--whiteboard${
                activeTileMode === "whiteboard" ? " active" : ""
            }`;
            whiteboardSection.dataset.workspaceMode = "whiteboard";
            whiteboardSection.style.setProperty(
                "--tile-depth",
                String(depth >= 0 ? depth : tileOrder.length - 1),
            );
            whiteboardSection.innerHTML = `<button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="whiteboard">${escapeHtml(i18n.t("module.study.classes.whiteboard"))}</button>`;
            if (activeTileMode === "whiteboard") {
                const whiteboardHost = document.createElement("div");
                whiteboardHost.className =
                    "classes-workspace-tile-content classes-whiteboard-workspace-host";
                whiteboardSection.appendChild(whiteboardHost);
                contentDivChanged = true;
            }
            const meetingTile = tilesContainer.querySelector(
                ".classes-workspace-tile--meeting",
            );
            if (meetingTile) {
                tilesContainer.insertBefore(whiteboardSection, meetingTile);
            } else {
                tilesContainer.appendChild(whiteboardSection);
            }
        }
        if (contentDivChanged) {
            getClassroomWindows?.()?.reattach();
        }
        for (const tabButton of root.querySelectorAll(
            ".classes-workspace-tab-btn[data-workspace-mode]",
        )) {
            const tabMode = String(tabButton.dataset.workspaceMode ?? "");
            tabButton.classList.toggle("active", tabMode === workspaceMode);
            if (tabMode === "meeting") {
                tabButton.classList.toggle(
                    "classes-meeting-pulse",
                    meetingOpen,
                );
            }
        }
        const meetingTile = tilesContainer.querySelector(
            ".classes-workspace-tile--meeting",
        );
        if (meetingTile instanceof HTMLElement) {
            meetingTile.classList.toggle("classes-meeting-pulse", meetingOpen);
        }
    };
}
