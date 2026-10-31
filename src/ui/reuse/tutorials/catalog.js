/** Present owner-localized plays through the existing decision popup. */
export async function openTutorialCatalog(api, ctx) {
    const controller = new AbortController();
    const signal = ctx.signal
        ? AbortSignal.any([ctx.signal, controller.signal])
        : controller.signal;
    for (const event of ["cognis:route-will-change", "popstate"])
        globalThis.window?.addEventListener(event, () => controller.abort(), {
            signal,
        });
    try {
        const reuse = ctx.capabilities.get("ui:reuse");
        const [{ createI18n }, { openPopup }, { escapeHtml }] =
            await Promise.all([
                reuse.importModule("i18n.js"),
                reuse.importModule("popup.js"),
                reuse.importModule("escape-html.js"),
            ]);
        const i18n = await createI18n({
            persistLocale: false,
            preferredLanguages: [document.documentElement.lang],
        });
        const plays = await api.list();
        if (signal.aborted) return false;
        if (!plays.length) {
            ctx.capabilities.get("ui:showToast")?.(
                i18n.t("ui.tutorial.empty"),
                {
                    variant: "info",
                },
            );
            return false;
        }
        let selected = plays[0].id;
        const result = await openPopup({
            signal,
            title: i18n.t("ui.reuse.tutorials"),
            body: `<label>${escapeHtml(i18n.t("ui.tutorial.choose"))}<select class="form-builder-input" data-tutorial-choice>${plays.map((play) => `<option value="${escapeHtml(play.id)}">${escapeHtml(play.title)}</option>`).join("")}</select></label>`,
            actions: [
                {
                    id: "start",
                    label: i18n.t("ui.reuse.start"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "neutral",
                },
            ],
            onOpen(overlay) {
                overlay
                    .querySelector("[data-tutorial-choice]")
                    .addEventListener("change", (event) => {
                        selected = event.target.value;
                    });
            },
        });
        if (result !== "start") return false;
        try {
            return await api.start(selected);
        } catch (error) {
            ctx.capabilities.get("ui:log")?.(
                "error",
                "Tutorial could not start.",
                {
                    component: "ui",
                    operation: "startTutorial",
                    errorName: error?.name,
                },
            );
            ctx.capabilities.get("ui:showToast")?.(
                i18n.t("ui.tutorial.error"),
                {
                    variant: "error",
                },
            );
            return false;
        }
    } finally {
        controller.abort();
    }
}
