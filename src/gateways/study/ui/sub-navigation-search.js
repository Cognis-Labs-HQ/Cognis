/**
 * Renders and binds Study dictionary search for inline and compact navigation.
 * Exports renderDictionarySearch for provider-owned fields and mountDictionarySearch
 * for a lifecycle-scoped dialog that retains the original form and its draft.
 * @example mountDictionarySearch(root, { signal, i18n });
 */
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { dictionarySearchContext } from "/static/gateways/study/library-client.js";

/** @param {object} model Registered dictionary choices and active language. @param {object} i18n Localizer. @returns {string} Search slot markup. */
export function renderDictionarySearch(model, i18n) {
    if (!model.dictionaryProviders?.length) return "";
    const providerLabel = (provider) =>
        provider.metadata.labels?.[document.documentElement.lang] ||
        provider.metadata.labels?.en ||
        provider.id;
    const searchLabel = (provider) =>
        i18n
            .t("gateway.study.dictionary_search_with")
            .replace("{{ provider }}", providerLabel(provider));
    const label = i18n.t("gateway.study.dictionary_search");
    const form = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "study-dictionary-search",
            formClassName: "study-dictionary-search",
            formAttributes: {
                "data-study-dictionary-search": true,
                "data-language": model.selectedLanguageCode,
            },
            includeSubmitButton: false,
            fields: [],
            trustedContentHtml: `<select class="theme-select" name="provider" aria-label="${escapeHtml(i18n.t("gateway.study.dictionary_provider"))}"${model.dictionaryProviders.length === 1 ? " hidden" : ""}>${model.dictionaryProviders.map((provider) => `<option data-search-label="${escapeHtml(searchLabel(provider))}" value="${escapeHtml(JSON.stringify({ id: provider.id, schemaId: provider.schemaId }))}">${escapeHtml(providerLabel(provider))}</option>`).join("")}</select>
            <input name="query" maxlength="100" required autocomplete="off" aria-label="${escapeHtml(label)}" placeholder="${escapeHtml(label)}">
            <button type="submit" class="btn-neutral" aria-label="${escapeHtml(searchLabel(model.dictionaryProviders[0]))}" title="${escapeHtml(searchLabel(model.dictionaryProviders[0]))}"><span class="study-dictionary-search-icon" aria-hidden="true"></span></button>`,
        },
    ).render();
    return `<div class="study-subnav-search-slot">
        ${form}
        <button type="button" class="study-dictionary-toggle btn-neutral" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}" aria-expanded="false" aria-haspopup="dialog"><span class="study-dictionary-search-icon" aria-hidden="true"></span></button>
    </div>`;
}

/** @param {HTMLElement} root Study page. @param {object} options Page lifetime and localization. @returns {void} */
export function mountDictionarySearch(root, { signal, i18n }) {
    const slot = root.querySelector(".study-subnav-search-slot");
    const form = slot?.querySelector("[data-study-dictionary-search]");
    const toggle = slot?.querySelector(".study-dictionary-toggle");
    if (!form || !toggle || signal.aborted) return;
    const media =
        root.ownerDocument.defaultView.matchMedia("(max-width: 900px)");
    const log = uiCtx.capabilities.get("ui:log");
    let opening = false;
    let close;

    form.addEventListener(
        "change",
        (event) => {
            const select = event.target.closest("select[name=provider]");
            if (!select) return;
            const button = form.querySelector("button[type=submit]");
            const label = select.selectedOptions[0].dataset.searchLabel;
            button.title = label;
            button.setAttribute("aria-label", label);
        },
        { signal },
    );

    form.addEventListener(
        "submit",
        async (event) => {
            event.preventDefault();
            const query = form.elements.query.value.trim();
            const button = form.querySelector("button[type=submit]");
            if (!query || button.disabled) return;
            const provider = JSON.parse(form.elements.provider.value);
            button.disabled = true;
            try {
                await dictionarySearchContext({
                    query,
                    providerId: provider.id,
                    schemaId: provider.schemaId,
                    language: form.dataset.language,
                });
                if (!signal.aborted) {
                    await close?.();
                    await uiCtx.capabilities.get("ui:navigate")?.(
                        "/study/library/search",
                    );
                }
            } catch (error) {
                log?.("error", "Study dictionary search failed.", {
                    component: "study",
                    operation: "dictionarySearch",
                    errorName: error?.name,
                    providerId: provider.id,
                });
                if (!signal.aborted)
                    showToast(
                        i18n.t("gateway.study.library_dictionary_error"),
                        { variant: "error" },
                    );
            } finally {
                button.disabled = false;
            }
        },
        { signal },
    );

    toggle.addEventListener(
        "click",
        async () => {
            if (opening || !media.matches) return;
            opening = true;
            toggle.setAttribute("aria-expanded", "true");
            log?.("info", "Study dictionary search opened.", {
                component: "study",
                operation: "openDictionarySearch",
            });
            try {
                await openPopup({
                    title: i18n.t("gateway.study.dictionary_search"),
                    body: "",
                    actions: [],
                    closeProtection: false,
                    signal,
                    onOpen(_overlay, dismiss, api) {
                        close = dismiss;
                        form.classList.add("study-dictionary-search--dialog");
                        api.updateBody("").append(form);
                        form.elements.query.focus({ preventScroll: true });
                    },
                });
            } catch (error) {
                log?.("error", "Study dictionary dialog failed.", {
                    component: "study",
                    operation: "openDictionarySearch",
                    errorName: error?.name,
                });
                if (!signal.aborted)
                    showToast(i18n.t("ui.reuse.error"), { variant: "error" });
            } finally {
                close = undefined;
                opening = false;
                toggle.setAttribute("aria-expanded", "false");
                form.classList.remove("study-dictionary-search--dialog");
                if (slot.isConnected && !signal.aborted) {
                    slot.prepend(form);
                    (media.matches ? toggle : form.elements.query).focus({
                        preventScroll: true,
                    });
                }
            }
        },
        { signal },
    );
    media.addEventListener(
        "change",
        () => {
            if (!media.matches) void close?.();
        },
        { signal },
    );
}
