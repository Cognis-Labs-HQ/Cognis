/** Keep the displayed locale separate from the account's configured language order. */
const selection = (globalThis[Symbol.for("cognis.uiLanguageSelection")] ??= {});
const identity = () =>
    JSON.stringify([
        globalThis.localStorage?.getItem("cognis_account"),
        globalThis.localStorage?.getItem("cognis_access_token"),
    ]);

function storedJson(key) {
    try {
        return JSON.parse(globalThis.localStorage?.getItem(key) ?? "null");
    } catch (error) {
        console.error("[i18n] invalid stored language preferences", {
            operation: "readLanguageSettings",
            errorName: error?.name,
        });
        return null;
    }
}

export function enabledUiLanguages() {
    const preferences = storedJson("cognis_ui_preferences");
    const priority = Array.isArray(preferences?.languagePriority)
        ? preferences.languagePriority
        : storedJson("cognis_language_priority");
    return [
        ...new Set(
            (Array.isArray(priority) ? priority : ["en"])
                .map(
                    (locale) =>
                        String(locale).trim().toLowerCase().split("-")[0],
                )
                .filter((locale) => /^[a-z]{2,3}$/.test(locale)),
        ),
    ];
}

export function activeUiLanguage() {
    return selection.owner === identity() &&
        enabledUiLanguages().includes(selection.locale)
        ? selection.locale
        : undefined;
}

export function selectUiLanguage(locale) {
    if (!enabledUiLanguages().includes(locale))
        throw new Error("ui_language_not_enabled");
    const previous = { ...selection };
    const owner = identity();
    selection.owner = owner;
    selection.locale = locale;
    return () => {
        if (selection.owner === owner && selection.locale === locale)
            Object.assign(
                selection,
                previous,
                previous.owner ? {} : { owner: undefined, locale: undefined },
            );
    };
}

export function uiLanguageMembershipChanged(current, next) {
    const members = (value) =>
        [...new Set(value ?? enabledUiLanguages())].sort();
    return (
        JSON.stringify(members(current?.languagePriority)) !==
            JSON.stringify(members(next?.languagePriority)) ||
        (current?.alwaysShowLanguageSwitcher !== false) !==
            (next?.alwaysShowLanguageSwitcher !== false) ||
        ((current?.languagePriorityMode ?? "auto") !==
            (next?.languagePriorityMode ?? "auto") &&
            next?.languagePriorityMode !== "manual")
    );
}
