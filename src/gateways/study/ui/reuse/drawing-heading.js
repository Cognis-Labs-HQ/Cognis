import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { entryExploreUrl } from "./explore.js";

export function bindDrawingHeading(
    heading,
    { signal, i18n, schemas, getCard, onReveal, runAction, reportFailure },
) {
    let revealed = false;
    heading.addEventListener(
        "keydown",
        (event) => {
            if (!revealed && ["Enter", " "].includes(event.key)) {
                event.preventDefault();
                heading.click();
            }
        },
        { signal },
    );
    heading.addEventListener(
        "click",
        (event) => {
            const modified =
                event.ctrlKey ||
                event.metaKey ||
                event.shiftKey ||
                event.altKey;
            if (!revealed || !modified) event.preventDefault();
            void runAction(async () => {
                const card = getCard();
                if (!revealed) {
                    revealed = true;
                    heading.removeAttribute("role");
                    heading.classList.remove("study-drawing-concealed");
                    heading.href = entryExploreUrl(card, schemas);
                    heading.textContent = card.label;
                    heading.setAttribute("aria-expanded", "true");
                    onReveal();
                    return;
                }
                if (modified) return;
                if (
                    /^\/study\/explore(?:\/|$)/.test(window.location.pathname)
                ) {
                    await uiCtx.capabilities.get("ui:navigate")(heading.href, {
                        state: { studyEntryId: card.id },
                    });
                    return;
                }
                let dismissPopup;
                const abort = () => {
                    void dismissPopup?.();
                };
                signal.addEventListener("abort", abort, { once: true });
                try {
                    const choice = await openPopup({
                        title: i18n.t("gateway.study.drawing_open_card"),
                        body: i18n.t("gateway.study.drawing_open_card_body"),
                        actions: [
                            {
                                id: "open",
                                label: i18n.t("ui.reuse.continue"),
                                variant: "confirm",
                            },
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "neutral",
                            },
                        ],
                        onOpen: (_overlay, dismiss) => {
                            dismissPopup = dismiss;
                            if (signal.aborted) abort();
                        },
                    });
                    if (
                        choice === "open" &&
                        !signal.aborted &&
                        card === getCard()
                    )
                        await uiCtx.capabilities.get("ui:navigate")(
                            heading.href,
                            { state: { studyEntryId: card.id } },
                        );
                } finally {
                    signal.removeEventListener("abort", abort);
                }
            }).catch(reportFailure);
        },
        { signal },
    );
    return () => {
        revealed = false;
        heading.textContent = "漢".repeat([...getCard().label].length);
        heading.classList.add("study-drawing-concealed");
        heading.removeAttribute("href");
        heading.setAttribute("role", "button");
        heading.setAttribute("aria-expanded", "false");
    };
}
