import { mountStudyLibraryPage } from "/static/modules/study/languages/reuse/library-page.js";

export async function mount(root, { signal } = {}) {
    await mountStudyLibraryPage(root, {
        signal,
        languageCode: "en",
    });
}

if (!globalThis.__spaRouter) {
    try {
        await mount(document.querySelector("#app"));
    } catch (error) {
        console.error("[study-en] library mount failed", error);
    }
}
