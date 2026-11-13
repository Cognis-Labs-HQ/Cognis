import { fetchLibraryLookupSuggestions } from "/static/gateways/study/library-client.js";
import { showToast } from "/static/reuse/toast.js";
import { reportClientError } from "/static/reuse/error-reporting.js";
import { LIBRARY_COMPOSER_LIMITS } from "../composer-limits.js";

export function bindAutomaticClassification(
    form,
    draft,
    { schema, layer, entries, providers, i18n, signal },
) {
    if (layer.semanticRole !== "lexicalUnit") return;
    let previous = "";
    let revision = 0;
    let inferred = [];
    let inferredClass;
    form.detectLibraryClassification = async () => {
        const label = form.elements.label.value.trim().normalize("NFKC");
        if (label === previous) return form.libraryClassificationPending;
        previous = label;
        const retained = form.elements.tags.value
            .split("\u001f")
            .filter((tag) => tag && !inferred.includes(tag));
        if (inferred.length) form.setLibraryTags(retained);
        inferred = [];
        if (inferredClass && form.elements.class.value === inferredClass)
            form.elements.class.value = "";
        inferredClass = undefined;
        const current = ++revision;
        if (!label) return;
        form.libraryClassificationPending = (async () => {
            try {
                const native = entries.filter(
                    (entry) =>
                        entry.hidden !== true &&
                        entry.schemaId === schema.id &&
                        entry.layer === layer.id &&
                        entry.label.normalize("NFKC") === label,
                );
                const suggestions = native.length
                    ? native
                    : (
                          await Promise.all(
                              providers
                                  .filter((provider) =>
                                      provider.capabilities?.includes(
                                          "dictionary",
                                      ),
                                  )
                                  .map((provider) =>
                                      fetchLibraryLookupSuggestions(
                                          provider.id,
                                          { ...draft, label },
                                      ),
                                  ),
                          )
                      ).flat();
                if (
                    signal.aborted ||
                    current !== revision ||
                    form.elements.label.value.trim().normalize("NFKC") !== label
                )
                    return;
                const choices = suggestions.filter(
                    (suggestion) =>
                        suggestion.label?.normalize("NFKC") === label,
                );
                if (!choices.length) return;
                const common = (choices[0].tags ?? []).filter((tag) =>
                    choices.every((choice) => choice.tags?.includes(tag)),
                );
                const manual = form.elements.tags.value
                    .split("\u001f")
                    .filter((tag) => tag && !inferred.includes(tag));
                const tags = [...new Set([...manual, ...common])];
                if (tags.length > LIBRARY_COMPOSER_LIMITS.tags) return;
                inferred = common.filter((tag) => !manual.includes(tag));
                form.setLibraryTags(tags);
                const classes = new Set(
                    choices.map((choice) => choice.class).filter(Boolean),
                );
                if (classes.size === 1) {
                    inferredClass = [...classes][0];
                    form.elements.class.value = inferredClass;
                }
            } catch (error) {
                if (signal.aborted) return;
                reportClientError({
                    component: "study-library",
                    operation: "detectClassification",
                    errorName: error?.name,
                });
                showToast(i18n.t("gateway.study.library_lookup_error"), {
                    variant: "error",
                });
            }
        })();
        return form.libraryClassificationPending;
    };
    form.addEventListener(
        "focusout",
        () => void form.detectLibraryClassification(),
        { signal },
    );
    form.addEventListener(
        "change",
        () => void form.detectLibraryClassification(),
        { signal },
    );
}
