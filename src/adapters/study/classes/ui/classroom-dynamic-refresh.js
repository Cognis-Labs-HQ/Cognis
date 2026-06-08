import {
    renderDeskFloor,
    renderStudentRoster,
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
    getActiveBoardPanel,
}) {
    return function refreshDynamicDom() {
        const snapshot = selectedSnapshot();
        if (!snapshot) return;
        const selectedSeatNumber = getSelectedSeatNumber();
        const activeBoardPanel = getActiveBoardPanel();

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

        // Re-render the blackboard member roster
        const membersSection = root.querySelector(
            ".classes-blackboard-section--members",
        );
        if (membersSection instanceof HTMLElement) {
            membersSection.innerHTML = renderStudentRoster({ snapshot, i18n });
        }

        // Sync board-panel visibility to current activeBoardPanel
        const agendaSection = root.querySelector(
            ".classes-blackboard-section--agenda",
        );
        if (agendaSection instanceof HTMLElement) {
            agendaSection.classList.toggle(
                "classes-blackboard-section--hidden",
                activeBoardPanel === "classroom",
            );
        }
        if (membersSection instanceof HTMLElement) {
            membersSection.classList.toggle(
                "classes-blackboard-section--hidden",
                activeBoardPanel !== "classroom",
            );
        }

        void hydrateProfileAvatars(root);
    };
}
