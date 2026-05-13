import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/study/languages"],
});
globalThis.__studyGatewayAvailable = true;

function createStudyNavButton() {
    const studyBtn = document.createElement("a");
    studyBtn.href = "/study";
    studyBtn.textContent = i18n.t("ui.reuse.study");
    return studyBtn;
}

function insertStudyButton(studyBtn) {
    const topnav = document.querySelector(".topnav");
    if (!topnav) return;
    topnav.appendChild(studyBtn);
}

const studyBtn = createStudyNavButton();
insertStudyButton(studyBtn);
