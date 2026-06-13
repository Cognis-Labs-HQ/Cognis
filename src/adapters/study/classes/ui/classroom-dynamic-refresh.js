import {
    renderDeskFloor,
    renderRosterPanel,
} from "/static/adapters/study/classes/classroom-render.js";
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
    i18n,
    fallbackRefreshDom,
}) {
    return function refreshWorkspaceTilesOnly() {
        const workspacePanel = root.querySelector(
            ".classes-workspace-panel--tiled",
        );
        const tilesContainer = root.querySelector(".classes-workspace-tiles");
        if (
            !(workspacePanel instanceof HTMLElement) ||
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
            workspaceMode === "whiteboard" || workspaceMode === "meeting"
                ? workspaceMode
                : "agenda";

        // Update layout class if it has changed
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

        const existingPrev = workspacePanel.querySelector(
            ".classes-tile-nav-prev",
        );
        const existingNext = workspacePanel.querySelector(
            ".classes-tile-nav-next",
        );
        if (tileLayout === "slideshow") {
            if (!(existingPrev instanceof HTMLButtonElement)) {
                const previousButton = document.createElement("button");
                previousButton.type = "button";
                previousButton.className = "classes-tile-nav-prev";
                previousButton.setAttribute(
                    "aria-label",
                    i18n.t("ui.reuse.previous"),
                );
                previousButton.innerHTML = "&#x25C4;";
                workspacePanel.insertBefore(previousButton, tilesContainer);
            }
            if (!(existingNext instanceof HTMLButtonElement)) {
                const nextButton = document.createElement("button");
                nextButton.type = "button";
                nextButton.className = "classes-tile-nav-next";
                nextButton.setAttribute("aria-label", i18n.t("ui.reuse.next"));
                nextButton.innerHTML = "&#x25BA;";
                workspacePanel.insertBefore(nextButton, tilesContainer);
            }
        } else {
            existingPrev?.remove();
            existingNext?.remove();
        }

        tilesContainer.dataset.activeWorkspaceMode = activeTileMode;
        const existingTiles = new Map();
        for (const tile of tilesContainer.querySelectorAll(
            ".classes-workspace-tile[data-workspace-mode]",
        )) {
            const tileMode = String(tile.dataset.workspaceMode ?? "");
            existingTiles.set(tileMode, tile);
            tile.classList.toggle("active", tileMode === activeTileMode);
            const depth = tileOrder.indexOf(tileMode);
            tile.style.setProperty(
                "--tile-depth",
                String(depth >= 0 ? depth : tileOrder.length),
            );
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
            chatSection.innerHTML = `<button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="chat">${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button><div class="classes-workspace-tile-content"><div class="classes-chat-workspace-host"></div></div>`;
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
            whiteboardSection.innerHTML = `<button type="button" class="classes-workspace-tile-hitbox" data-workspace-mode="whiteboard">${escapeHtml(i18n.t("module.study.classes.whiteboard"))}</button><div class="classes-workspace-tile-content classes-whiteboard-workspace-host"></div>`;
            const meetingTile = tilesContainer.querySelector(
                ".classes-workspace-tile--meeting",
            );
            if (meetingTile) {
                tilesContainer.insertBefore(whiteboardSection, meetingTile);
            } else {
                tilesContainer.appendChild(whiteboardSection);
            }
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
