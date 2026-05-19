/**
 * Font preference utilities — catalog loading, font-family selection UI, and
 * settings-page integration for the application font picker.
 *
 * Public exports:
 *   DEFAULT_FONT          — default font family name ("Orbitron").
 *   DEFAULT_FONT_SIZE     — default font size in points (12).
 *   toFontFamilyValue(font)                  — formats a font name as a valid CSS font-family value.
 *   parseSavedFont(fontValue)                — extracts the primary family name from a saved CSS string.
 *   loadFontsCatalog()                       — resolves all available font families from document.fonts.
 *   buildFontSelect(container, fontList, initialValue, onChange) — renders a font-selector dropdown.
 *   initFontPrefs(root, options)             — wires up the full font-preference UI inside root.
 *
 * Usage:
 *   import { initFontPrefs, DEFAULT_FONT_SIZE } from '../reuse/font-prefs.js';
 *   const prefs = initFontPrefs(root, { existingPrefs, i18n, onDirtyChange });
 *   await prefs.init();
 *
 * @param {string} font — a font family name, e.g. "Inter" or "My Custom Font".
 * @returns {string} A CSS-safe font-family value, quoted if the name contains spaces.
 */

export const DEFAULT_FONT = "Orbitron";
export const DEFAULT_FONT_SIZE = 12;
const FALLBACK_FONTS = [DEFAULT_FONT, "Inter", "Arial", "sans-serif"];

export function toFontFamilyValue(font) {
    if (!font) return DEFAULT_FONT;
    return /^[a-zA-Z0-9-]+$/.test(font)
        ? font
        : `"${font.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

export function parseSavedFont(fontValue) {
    if (!fontValue || typeof fontValue !== "string") return DEFAULT_FONT;
    return (
        fontValue
            .split(",")[0]
            .trim()
            .replace(/^['"]|['"]$/g, "") || DEFAULT_FONT
    );
}

export async function loadFontsCatalog() {
    await document.fonts.ready;
    const seen = new Set(FALLBACK_FONTS);
    document.fonts.forEach((face) => {
        const family = face.family.replace(/^['"]|['"]$/g, "").trim();
        if (family) seen.add(family);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function buildFontSelect(container, fontList, initialValue, onChange) {
    const select = document.createElement("select");
    select.className = "theme-select";

    fontList.forEach((font) => {
        const option = document.createElement("option");
        option.value = font;
        option.textContent = font;
        option.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;
        if (font === initialValue) option.selected = true;
        select.append(option);
    });

    select.addEventListener("change", () => onChange(select.value));

    container.append(select);

    return {
        getValue: () => select.value,
        setValue: (font) => {
            select.value = font;
        },
        destroy: () => select.remove(),
    };
}

export function initFontPrefs(root, { existingPrefs, i18n, onDirtyChange }) {
    const fontPreview = root.querySelector("#pref-font-preview");
    const fontPickerContainer = root.querySelector("#pref-font-picker");
    const fontSizeValue = root.querySelector("#pref-font-size-value");
    const resetBtn = root.querySelector("#pref-font-reset");

    const rawStoredSize = Number(
        existingPrefs?.appFontSize ??
            existingPrefs?.greetingFontSize ??
            DEFAULT_FONT_SIZE,
    );
    // Values below 8 are legacy rem values; convert to pt (1rem ≈ 12pt at default browser zoom).
    const normalizedSize =
        rawStoredSize < 8 ? Math.round(rawStoredSize * 12) : rawStoredSize;
    let fontSize = Math.max(8, Math.min(24, Math.round(normalizedSize)));

    let savedFont = parseSavedFont(
        existingPrefs?.appFont || existingPrefs?.greetingFont,
    );
    let savedSize = fontSize;

    function isAtDefault() {
        const current = pickerControl?.getValue() || DEFAULT_FONT;
        return current === DEFAULT_FONT && fontSize === DEFAULT_FONT_SIZE;
    }

    function updateResetButton() {
        if (!resetBtn) return;
        const atDefault = isAtDefault();
        resetBtn.disabled = atDefault;
        resetBtn.classList.toggle("btn-cancel", !atDefault);
        resetBtn.classList.toggle("btn-animated", !atDefault);
    }

    function notifyDirty() {
        const current = pickerControl?.getValue() || DEFAULT_FONT;
        const dirty = current !== savedFont || fontSize !== savedSize;
        onDirtyChange?.(dirty);
        updateResetButton();
    }

    function updatePreview(selectedFont) {
        if (!fontPreview) return;
        fontPreview.style.fontFamily = `${toFontFamilyValue(selectedFont)}, Arial, sans-serif`;
    }

    function setFontSize(nextSize) {
        fontSize = Math.max(8, Math.min(24, Math.round(nextSize)));
        if (fontSizeValue) fontSizeValue.textContent = `${fontSize} pt`;
        if (fontPreview) fontPreview.style.fontSize = `${fontSize}pt`;
        notifyDirty();
    }

    let pickerControl = null;

    async function init() {
        const fontOptions = await loadFontsCatalog().catch(() => [
            ...FALLBACK_FONTS,
        ]);
        const fonts = Array.from(
            new Set([...FALLBACK_FONTS, ...fontOptions]),
        ).sort((a, b) => a.localeCompare(b));

        if (!fonts.includes(savedFont)) fonts.unshift(savedFont);

        if (fontPickerContainer) {
            pickerControl = buildFontSelect(
                fontPickerContainer,
                fonts,
                savedFont,
                (font) => {
                    updatePreview(font);
                    notifyDirty();
                },
            );
        }

        updatePreview(pickerControl?.getValue() || DEFAULT_FONT);
        setFontSize(fontSize);

        if (fontSizeValue) fontSizeValue.textContent = `${fontSize} pt`;

        root.querySelector("#pref-font-size-down")?.addEventListener(
            "click",
            () => setFontSize(fontSize - 1),
        );
        root.querySelector("#pref-font-size-up")?.addEventListener(
            "click",
            () => setFontSize(fontSize + 1),
        );

        resetBtn?.addEventListener("click", () => {
            if (isAtDefault()) return;
            pickerControl?.setValue(DEFAULT_FONT);
            updatePreview(DEFAULT_FONT);
            setFontSize(DEFAULT_FONT_SIZE);
        });

        updateResetButton();
    }

    function commit() {
        savedFont = pickerControl?.getValue() || DEFAULT_FONT;
        savedSize = fontSize;
    }

    function discard() {
        pickerControl?.setValue(savedFont);
        updatePreview(savedFont);
        setFontSize(savedSize);
    }

    return {
        init,
        getFont: () => pickerControl?.getValue() || DEFAULT_FONT,
        getFontSize: () => fontSize,
        isDirty: () => {
            const current = pickerControl?.getValue() || DEFAULT_FONT;
            return current !== savedFont || fontSize !== savedSize;
        },
        commit,
        discard,
    };
}
