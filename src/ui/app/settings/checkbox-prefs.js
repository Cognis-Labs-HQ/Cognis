export function initCheckboxPrefs(
    root,
    {
        existingPrefs,
        onDirtyChange,
        onCommit,
        preference = "alwaysShowLanguageSwitcher",
        selector = "#pref-always-show-language-switcher",
    } = {},
) {
    let savedValue = existingPrefs?.[preference] !== false;
    let value = savedValue;

    function getInput() {
        return root.querySelector(selector);
    }

    function syncInput() {
        const input = getInput();
        if (!input) return;
        input.checked = value;
    }

    function bind() {
        const input = getInput();
        if (!input) return;
        input.checked = value;
        input.onchange = () => {
            value = input.checked;
            onDirtyChange?.(value !== savedValue);
        };
    }

    return {
        bind,
        getValue: () => value,
        isDirty: () => value !== savedValue,
        commit() {
            savedValue = value;
            syncInput();
            onDirtyChange?.(false);
            onCommit?.(value);
        },
        discard() {
            value = savedValue;
            syncInput();
            onDirtyChange?.(false);
        },
    };
}
