import { openPopup } from "/static/reuse/popup.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { entryExploreUrl } from "./explore.js";

export function bindDrawingHeading(
    heading,
    {
        signal,
        i18n,
        schemas,
        getCard,
        onReveal,
        onNavigate,
        runAction,
        reportFailure,
    },
) {
    let revealed = false;
    const inExplore = /^\/study\/explore(?:\/|$)/.test(
        window.location.pathname,
    );
    const navigateCard = (card) =>
        onNavigate
            ? onNavigate(card)
            : uiCtx.capabilities.get("ui:navigate")(
                  entryExploreUrl(card, schemas),
                  { state: { studyEntryId: card.id } },
              );
    heading.addEventListener(
        "click",
        (event) => {
            event.preventDefault();
            void runAction(async () => {
                const card = getCard();
                if (!revealed) {
                    revealed = true;
                    heading.classList.remove("study-drawing-concealed");
                    heading.textContent = card.label;
                    heading.setAttribute("aria-expanded", "true");
                    onReveal();
                    return;
                }
                if (inExplore) {
                    await navigateCard(card);
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
                    ) {
                        await navigateCard(card);
                    }
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
        heading.setAttribute("aria-expanded", "false");
    };
}
