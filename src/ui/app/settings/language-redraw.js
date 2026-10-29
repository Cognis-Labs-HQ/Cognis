import { changeUiLanguage } from "../../reuse/ui-language-catalog.js";
import { captureAccountGuard } from "../../reuse/offline-identity.js";
import { showToast } from "../../reuse/toast.js";

/** Schedule a guarded language redraw after Save has released its dirty state. */
export function createLanguageRedraw({ i18n, signal }) {
    const assertAccount = captureAccountGuard();
    let timer;
    signal?.addEventListener("abort", () => clearTimeout(timer), {
        once: true,
    });
    return (locale) => {
        clearTimeout(timer);
        if (signal?.aborted) return;
        timer = setTimeout(async () => {
            if (signal?.aborted) return;
            try {
                assertAccount();
                await changeUiLanguage(locale);
            } catch (error) {
                if (signal?.aborted) return;
                console.error("[settings]:language-redraw-failed", {
                    operation: "redrawLanguage",
                    errorName: error?.name,
                });
                showToast(i18n.t("ui.reuse.error"), { variant: "error" });
            }
        }, 2000);
    };
}
