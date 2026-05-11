import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { createI18n } from "/static/reuse/i18n.js";

const i18n = await createI18n();
globalThis.__studyGatewayAvailable = true;

function createStudyNavButton() {
    const studyBtn = document.createElement("a");
    studyBtn.href = "/study";
    studyBtn.dataset.studyBound = "false";
    studyBtn.textContent = i18n.t("ui.reuse.nav.study");
    return studyBtn;
}

function insertStudyButton(studyBtn) {
    const topnav = document.querySelector(".topnav");
    if (!topnav) return;
    topnav.appendChild(studyBtn);
}

async function handleStudyButtonClick() {
    let languages = [];
    try {
        const response = await apiFetch("/api/v1/study/languages");
        if (response.ok) {
            const payload = await response.json();
            languages = Array.isArray(payload?.data) ? payload.data : [];
        }
    } catch {
        // language fetch failed; proceed with empty list
    }

    const selectOptions = languages
        .map(
            (lang) =>
                `<option value="${escapeHtml(lang.code)}">${escapeHtml(lang.flag || "")} ${escapeHtml(lang.name)} (${escapeHtml(lang.code)})</option>`,
        )
        .join("");

    const action = await openPopup({
        title: i18n.t("ui.study.picker.title"),
        body: `
            <label class="stack">
                ${i18n.t("ui.study.picker.select")}
                <select id="study-language-select" class="theme-select">
                    ${selectOptions}
                </select>
            </label>
        `,
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.popup.cancel"),
                variant: "cancel",
            },
            {
                id: "study",
                label: i18n.t("ui.study.picker.start"),
                variant: "confirm",
            },
        ],
    });

    if (action !== "study") return;
    const select = document.getElementById("study-language-select");
    const selectedCode = select?.value;
    if (selectedCode) {
        try {
            const modulesResponse = await apiFetch(
                `/api/v1/study/languages/${encodeURIComponent(selectedCode)}/modules`,
            );
            if (modulesResponse.ok) {
                const modulesPayload = await modulesResponse.json();
                const firstModule = Array.isArray(modulesPayload?.data)
                    ? modulesPayload.data[0]
                    : null;
                const firstPageUrl = String(firstModule?.pageUrl ?? "").trim();
                if (firstPageUrl) {
                    navigateTo(firstPageUrl);
                    return;
                }
            }
        } catch {
            // Fall back to language root below.
        }
        navigateTo(`/study/${encodeURIComponent(selectedCode)}`);
    }
}

const studyBtn = createStudyNavButton();
studyBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void handleStudyButtonClick();
});
insertStudyButton(studyBtn);
