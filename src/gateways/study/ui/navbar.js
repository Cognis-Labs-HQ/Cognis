import { apiFetch } from "/static/reuse/api-client.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n({
    componentStringBaseUrls: ["/static/gateways/study/languages"],
});
globalThis.__studyGatewayAvailable = true;

async function hasRegisteredLanguages() {
    try {
        const response = await apiFetch("/api/v1/study/registered-languages");
        if (!response.ok) return false;
        const payload = await response.json();
        return Array.isArray(payload?.data) && payload.data.length > 0;
    } catch {
        return false;
    }
}

function createStudyNavButton(hasLanguages) {
    const studyBtn = document.createElement("a");
    studyBtn.href = "/study";
    studyBtn.textContent = i18n.t("ui.reuse.study");
    if (!hasLanguages) {
        studyBtn.setAttribute("aria-disabled", "true");
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
const studyBtn = createStudyNavButton(languagesAvailable);
insertStudyButton(studyBtn);
