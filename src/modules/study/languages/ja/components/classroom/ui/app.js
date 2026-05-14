import { mountStudyClassroomPage } from "/static/modules/study/languages/reuse/classroom-page.js";

export async function mount(root, { signal } = {}) {
    await mountStudyClassroomPage(root, {
        signal,
        languageCode: "ja",
    });
}

if (!globalThis.__spaRouter) {
    try {
        await mount(document.querySelector("#app"));
    } catch (error) {
        console.error("[study-ja] classroom mount failed", error);
    }
}
