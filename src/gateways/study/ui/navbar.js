import { apiFetch } from "/static/reuse/api-client.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/study/languages"],
});
globalThis.__studyGatewayAvailable = true;

async function hasRegisteredLanguages() {
    try {
        const response = await apiFetch("/api/v1/study/registered-languages");
        if (!response.ok) {
            console.error(
                "[study-navbar] Failed to load registered languages:",
                response.status,
            );
            return null;
        }
        const payload = await response.json();
        return Array.isArray(payload?.data) && payload.data.length > 0;
    } catch (fetchError) {
        console.error(
            "[study-navbar] Error loading registered languages:",
            fetchError,
        );
        return null;
    }
}

function createStudyNavButton(languagesAvailable, i18n) {
    const studyBtn = document.createElement("a");
    studyBtn.href = "/study";
    studyBtn.textContent = i18n.t("ui.reuse.study");
    studyBtn.dataset.navOrder = "40";
    studyBtn.dataset.mobilePriority = "3";
    if (languagesAvailable === false) {
        studyBtn.setAttribute("aria-disabled", "true");
        studyBtn.setAttribute("title", i18n.t("gateway.study.no_languages"));
        studyBtn.removeAttribute("href");
    }
    return studyBtn;
}

function insertStudyButton(studyBtn) {
    const topnav = document.querySelector(".topnav");
    if (!topnav) return;
    topnav.appendChild(studyBtn);
}

const languagesAvailable = await hasRegisteredLanguages();
const studyBtn = createStudyNavButton(languagesAvailable, i18n);
insertStudyButton(studyBtn);
