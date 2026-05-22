import { mountStudyClassroomPage } from "/static/modules/study/languages/reuse/classroom-page.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";

export async function mount(root, { signal } = {}) {
    await mountStudyClassroomPage(root, {
        signal,
        languageCode: "en",
    });
}

await mountWhenDirect(mount).catch((error) =>
    console.error("[study-en] classroom mount failed", error),
);
