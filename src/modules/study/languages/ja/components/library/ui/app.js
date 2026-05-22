import { mountStudyLibraryPage } from "/static/modules/study/languages/reuse/library-page.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";

export async function mount(root, { signal } = {}) {
    await mountStudyLibraryPage(root, {
        signal,
        languageCode: "ja",
    });
}

await mountWhenDirect(mount).catch((error) =>
    console.error("[study-ja] library mount failed", error),
);
