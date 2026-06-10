import {
    renderDeskFloor,
    renderRosterPanel,
} from "/static/adapters/study/classes/classroom-render.js";
import { hydrateProfileAvatars } from "/static/gateways/social/reuse/profile-avatar.js";

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
    getWorkspaceMode,
}) {
    return function refreshDynamicDom() {
        const snapshot = selectedSnapshot();
        if (!snapshot) return;
        const selectedSeatNumber = getSelectedSeatNumber();
        const workspaceMode = getWorkspaceMode();

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
        if (workspaceMode === "roster") {
            const rosterSection = root.querySelector(
                ".classes-workspace-roster",
            );
            if (rosterSection instanceof HTMLElement) {
                rosterSection.innerHTML = rosterPanelMarkup;
            }
        }

        void hydrateProfileAvatars(root);
    };
}
