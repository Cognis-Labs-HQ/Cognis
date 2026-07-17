import {
    loadFontsCatalog,
    parseSavedFont,
    toFontFamilyValue,
} from "/static/reuse/font-prefs.js";

export function createWhiteboardTextTools({
    canvasElement,
    commitElements,
    currentAppFont,
    getElements,
    getTextFormatMenu,
    getTextElement,
    positionTextOverlay,
    selectOnlyElement,
    setTextFormatMenu,
}) {
    let fontCatalogPromise = null;

    function updateTextStyle(elementId, patch) {
        commitElements(
            getElements().map((item) =>
                item.id === elementId
                    ? { ...item, ...patch, version: (item.version || 1) + 1 }
                    : item,
            ),
        );
    }

    function loadTextMenuFonts(select, selectedFont) {
        if (!fontCatalogPromise) {
            fontCatalogPromise = loadFontsCatalog().catch(() => [
                currentAppFont(),
                "Inter",
                "Arial",
                "sans-serif",
            ]);
        }
        void fontCatalogPromise.then((fonts) => {
            if (!select.isConnected) return;
            const options = Array.from(
                new Set([selectedFont, ...fonts]),
            ).filter(Boolean);
            select.replaceChildren(
                ...options.map((font) => {
                    const option = document.createElement("option");
                    option.value = font;
                    option.textContent = font;
                    option.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;
                    if (font === selectedFont) option.selected = true;
                    return option;
                }),
            );
        });
    }

    function syncTextFormatMenu() {
        const element = getTextElement();
        if (!element) {
            getTextFormatMenu()?.remove();
            setTextFormatMenu(null);
            return;
        }
        const parent = canvasElement.parentElement;
        if (!parent) return;
        let textFormatMenu = getTextFormatMenu();
        if (!textFormatMenu?.isConnected) {
            textFormatMenu = document.createElement("div");
            textFormatMenu.className = "whiteboard-text-menu";
            textFormatMenu.innerHTML = `
        <button type="button" data-text-toggle="bold" aria-label="Bold">B</button>
        <button type="button" data-text-toggle="italic" aria-label="Italic"><em>I</em></button>
        <button type="button" data-text-toggle="underline" aria-label="Underline"><u>U</u></button>
        <button type="button" data-text-toggle="line-through" aria-label="Strikethrough"><s>S</s></button>
        <input type="number" min="8" max="96" step="1" data-text-size aria-label="Font size" />
        <select data-text-font aria-label="Font family"></select>
      `;
            parent.appendChild(textFormatMenu);
            bindTextMenuEvents(textFormatMenu, updateTextStyle, getTextElement);
            setTextFormatMenu(textFormatMenu);
        }
        positionTextOverlay(textFormatMenu, element, -48);
        const sizeInput = textFormatMenu.querySelector("[data-text-size]");
        if (sizeInput) sizeInput.value = String(element.fontSize ?? 28);
        const fontSelect = textFormatMenu.querySelector("[data-text-font]");
        const selectedFont = parseSavedFont(
            element.fontFamily || currentAppFont(),
        );
        if (fontSelect) loadTextMenuFonts(fontSelect, selectedFont);
        syncTextMenuToggleStates(textFormatMenu, element);
    }

    function updateTextElement(element, text) {
        const nextText = text.trim() || "Text";
        const fontSize = element.fontSize ?? 28;
        const width = Math.max(160, nextText.length * fontSize * 0.62);
        const height = Math.max(56, fontSize * 1.8);
        commitElements(
            getElements().map((item) =>
                item.id === element.id
                    ? {
                          ...item,
                          text: nextText,
                          width,
                          height,
                          version: (item.version || 1) + 1,
                      }
                    : item,
            ),
        );
        selectOnlyElement(element.id);
    }

    function openTextEditor(element) {
        const parent = canvasElement.parentElement;
        if (!parent) return;
        parent.querySelector(".wb-text-editor")?.remove();
        const editor = document.createElement("textarea");
        editor.className = "wb-text-editor whiteboard-text-editor";
        editor.value = element.text ?? "Text";
        positionTextOverlay(editor, element);
        editor.style.width = `${Math.max(180, element.width ?? 180)}px`;
        editor.style.height = `${Math.max(64, element.height ?? 64)}px`;
        editor.style.fontSize = `${element.fontSize ?? 28}px`;
        editor.style.fontFamily = `${element.fontFamily || toFontFamilyValue(currentAppFont())}, Arial, sans-serif`;
        editor.style.fontWeight = element.fontWeight === "700" ? "700" : "400";
        editor.style.fontStyle =
            element.fontStyle === "italic" ? "italic" : "normal";
        parent.appendChild(editor);
        editor.focus();
        editor.select();
        let finished = false;
        const finish = () => {
            if (finished) return;
            finished = true;
            const value = editor.value;
            editor.parentNode?.removeChild(editor);
            updateTextElement(element, value);
        };
        editor.addEventListener("blur", finish, { once: true });
        editor.addEventListener("keydown", (event) => {
            if (event.key === "Escape") {
                finished = true;
                editor.parentNode?.removeChild(editor);
                selectOnlyElement(element.id);
            } else if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                finish();
            }
        });
    }

    return { openTextEditor, syncTextFormatMenu, updateTextElement };
}

function bindTextMenuEvents(textFormatMenu, updateTextStyle, getTextElement) {
    textFormatMenu.addEventListener("click", (event) => {
        const button = event.target.closest("[data-text-toggle]");
        const target = getTextElement();
        if (!button || !target) return;
        const toggle = button.dataset.textToggle;
        if (toggle === "bold") {
            updateTextStyle(target.id, {
                fontWeight: target.fontWeight === "700" ? "400" : "700",
            });
        } else if (toggle === "italic") {
            updateTextStyle(target.id, {
                fontStyle: target.fontStyle === "italic" ? "normal" : "italic",
            });
        } else {
            const parts = new Set(
                String(target.textDecoration ?? "none")
                    .split(" ")
                    .filter((item) => item && item !== "none"),
            );
            if (parts.has(toggle)) parts.delete(toggle);
            else parts.add(toggle);
            updateTextStyle(target.id, {
                textDecoration: parts.size ? [...parts].join(" ") : "none",
            });
        }
    });
    textFormatMenu
        .querySelector("[data-text-size]")
        ?.addEventListener("change", (event) => {
            const target = getTextElement();
            if (!target) return;
            updateTextStyle(target.id, {
                fontSize: Math.max(
                    8,
                    Math.min(96, Number(event.target.value) || 28),
                ),
            });
        });
    textFormatMenu
        .querySelector("[data-text-font]")
        ?.addEventListener("change", (event) => {
            const target = getTextElement();
            if (!target) return;
            updateTextStyle(target.id, {
                fontFamily: `${toFontFamilyValue(event.target.value)}, Arial, sans-serif`,
            });
        });
}

function syncTextMenuToggleStates(textFormatMenu, element) {
    textFormatMenu
        .querySelector('[data-text-toggle="bold"]')
        ?.classList.toggle("active", element.fontWeight === "700");
    textFormatMenu
        .querySelector('[data-text-toggle="italic"]')
        ?.classList.toggle("active", element.fontStyle === "italic");
    const decoration = String(element.textDecoration ?? "none");
    textFormatMenu
        .querySelector('[data-text-toggle="underline"]')
        ?.classList.toggle("active", decoration.includes("underline"));
    textFormatMenu
        .querySelector('[data-text-toggle="line-through"]')
        ?.classList.toggle("active", decoration.includes("line-through"));
}
