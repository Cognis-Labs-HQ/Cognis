import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n();

const topnav = document.querySelector(".topnav");
if (topnav instanceof HTMLElement) {
    if (!topnav.querySelector('[data-study-classroom-link="true"]')) {
        const classroomLink = document.createElement("a");
        classroomLink.href = "/classroom";
        classroomLink.dataset.studyClassroomLink = "true";
        classroomLink.textContent = i18n.t(
            "module.study.classes.classroom_page_title",
        );
        topnav.appendChild(classroomLink);
    }
}
