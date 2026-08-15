export function initLanguageSwitcherPrefs(
    root,
    { existingPrefs, onDirtyChange, onValueChange } = {},
) {
    let savedValue = existingPrefs?.alwaysShowLanguageSwitcher !== false;
    let value = savedValue;

    function getInput() {
        return root.querySelector("#pref-always-show-language-switcher");
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
            onValueChange?.(value);
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
        },
        discard() {
            value = savedValue;
            syncInput();
            onDirtyChange?.(false);
            onValueChange?.(value);
        },
    };
}
