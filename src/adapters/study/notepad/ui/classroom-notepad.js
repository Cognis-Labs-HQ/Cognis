import { apiFetch } from "/static/reuse/api-client.js";
import { showToast } from "/static/reuse/toast.js";

const STORAGE_PREFIX = "classes_notepad_";

const ALLOWED_TAGS = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "blockquote",
    "pre",
    "code",
    "strong",
    "em",
    "u",
    "s",
    "br",
    "ul",
    "ol",
    "li",
    "span",
    "div",
    "font",
]);

const ALLOWED_ATTRS = new Set(["style", "class"]);

function sanitizeNotepadHtml(html) {
    const container = document.createElement("div");
    container.innerHTML = html;
    const walker = document.createTreeWalker(
        container,
        NodeFilter.SHOW_ELEMENT,
        null,
    );
    const toRemove = [];
    let node = walker.nextNode();
    while (node) {
        if (!(node instanceof Element)) {
            node = walker.nextNode();
            continue;
        }
        if (!ALLOWED_TAGS.has(node.tagName.toLowerCase())) {
            toRemove.push(node);
        } else {
            for (const attr of Array.from(node.attributes)) {
                if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
                    node.removeAttribute(attr.name);
                }
            }
        }
        node = walker.nextNode();
    }
    for (const element of toRemove) {
        element.replaceWith(...Array.from(element.childNodes));
    }
    return container.innerHTML;
}

const TEXT_STYLES = [
    { value: "p", label: "module.study.classes.notepad_format_paragraph" },
    { value: "h1", label: "module.study.classes.notepad_format_heading1" },
    { value: "h2", label: "module.study.classes.notepad_format_heading2" },
    { value: "blockquote", label: "module.study.classes.notepad_format_quote" },
    { value: "pre", label: "module.study.classes.notepad_format_code" },
];

const FONT_SIZES = ["12", "14", "16", "18", "22", "28", "36"];

export function createClassroomNotepad({ classId, i18n }) {
    const storageKey = STORAGE_PREFIX + classId;
    const downloadSlug = String(classId)
        .trim()
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "")
        .toLowerCase();

    let panel = null;
    let editor = null;

    function loadDraft() {
        try {
            return sessionStorage.getItem(storageKey) ?? "";
        } catch {
            return "";
        }
    }

    function saveDraft(html) {
        try {
            sessionStorage.setItem(storageKey, html);
        } catch {}
    }

    function clearDraft() {
        try {
            sessionStorage.removeItem(storageKey);
        } catch {}
    }

    function getEditorHtml() {
        return editor ? editor.innerHTML : loadDraft();
    }

    function editorToPlainText() {
        const clone = document.createElement("div");
        clone.innerHTML = getEditorHtml();
        return clone.innerText ?? clone.textContent ?? "";
    }

    const ALLOWED_STYLE_TAGS = new Set(TEXT_STYLES.map((style) => style.value));
    const MIN_FONT_SIZE = 8;
    const MAX_FONT_SIZE = 96;

    function execStyle(tag) {
        if (!editor || !ALLOWED_STYLE_TAGS.has(tag)) return;
        editor.focus();
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;
        const range = selection.getRangeAt(0);
        const block = document.createElement(tag);
        block.appendChild(range.extractContents());
        range.insertNode(block);
        selection.removeAllRanges();
        const newRange = document.createRange();
        newRange.selectNodeContents(block);
        newRange.collapse(false);
        selection.addRange(newRange);
        saveDraft(editor.innerHTML);
    }

    function applyFontSize(size) {
        if (!editor) return;
        const parsed = parseInt(size, 10);
        if (isNaN(parsed) || parsed < MIN_FONT_SIZE || parsed > MAX_FONT_SIZE)
            return;
        editor.focus();
        document.execCommand("fontSize", false, "7");
        const fontEls = editor.querySelectorAll('font[size="7"]');
        for (const fontEl of fontEls) {
            fontEl.removeAttribute("size");
            fontEl.style.fontSize = `${parsed}px`;
        }
        saveDraft(editor.innerHTML);
    }

    function applyColor(color) {
        if (!editor) return;
        if (!/^#[0-9a-f]{6}$/i.test(color)) return;
        editor.focus();
        document.execCommand("foreColor", false, color);
        saveDraft(editor.innerHTML);
    }

    async function saveToClass() {
        const html = getEditorHtml();
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(classId)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ materials: html }),
            },
        ).catch(() => null);
        if (response?.ok) {
            showToast(i18n.t("module.study.classes.notepad_saved"), {
                variant: "success",
            });
        } else {
            showToast(i18n.t("module.study.classes.notepad_save_failed"), {
                variant: "error",
            });
        }
    }

    async function openFromClass() {
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(classId)}/resources`,
        ).catch(() => null);
        if (!response?.ok) return;
        const payload = await response.json().catch(() => null);
        const materials = String(payload?.data?.materials ?? "").trim();
        if (editor && materials) {
            editor.innerHTML = sanitizeNotepadHtml(materials);
            saveDraft(editor.innerHTML);
        }
    }

    function downloadAsMarkdown() {
        const text = editorToPlainText();
        const date = new Date().toISOString().slice(0, 10);
        const filename = `${downloadSlug || "classroom"}-${date}-notes.md`;
        const blob = new Blob([text], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
    }

    function buildPanel() {
        const panelEl = document.createElement("div");
        panelEl.className = "classes-notepad-panel";
        panelEl.setAttribute("role", "region");
        panelEl.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad"),
        );

        const toolbar = document.createElement("div");
        toolbar.className = "classes-notepad-toolbar";

        const styleSelect = document.createElement("select");
        styleSelect.className = "classes-notepad-style-select";
        styleSelect.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad_format_paragraph"),
        );
        for (const style of TEXT_STYLES) {
            const option = document.createElement("option");
            option.value = style.value;
            option.textContent = i18n.t(style.label);
            styleSelect.appendChild(option);
        }

        const sizeSelect = document.createElement("select");
        sizeSelect.className = "classes-notepad-size-select";
        sizeSelect.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad_font_size"),
        );
        for (const size of FONT_SIZES) {
            const option = document.createElement("option");
            option.value = size;
            option.textContent = size;
            if (size === "16") option.selected = true;
            sizeSelect.appendChild(option);
        }

        const colorInput = document.createElement("input");
        colorInput.type = "color";
        colorInput.className = "classes-notepad-color-input";
        colorInput.value = "#ffffff";
        colorInput.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad_color"),
        );

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "classes-notepad-save-btn";
        saveBtn.textContent = i18n.t("module.study.classes.notepad_save");

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "classes-notepad-open-btn";
        openBtn.textContent = i18n.t("module.study.classes.notepad_open");

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "classes-notepad-download-btn";
        downloadBtn.textContent = i18n.t(
            "module.study.classes.notepad_download",
        );

        toolbar.appendChild(styleSelect);
        toolbar.appendChild(sizeSelect);
        toolbar.appendChild(colorInput);
        toolbar.appendChild(saveBtn);
        toolbar.appendChild(openBtn);
        toolbar.appendChild(downloadBtn);

        editor = document.createElement("div");
        editor.className = "classes-notepad-editor";
        editor.contentEditable = "true";
        editor.setAttribute("aria-multiline", "true");
        editor.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad"),
        );
        editor.spellcheck = true;
        const draft = loadDraft();
        if (draft) {
            editor.innerHTML = sanitizeNotepadHtml(draft);
        }

        editor.addEventListener("input", () => {
            saveDraft(editor.innerHTML);
        });

        styleSelect.addEventListener("change", () => {
            execStyle(styleSelect.value);
        });

        sizeSelect.addEventListener("change", () => {
            applyFontSize(sizeSelect.value);
        });

        colorInput.addEventListener("input", () => {
            applyColor(colorInput.value);
        });

        saveBtn.addEventListener("click", () => {
            void saveToClass();
        });

        openBtn.addEventListener("click", () => {
            void openFromClass();
        });

        downloadBtn.addEventListener("click", () => {
            downloadAsMarkdown();
        });

        panelEl.appendChild(toolbar);
        panelEl.appendChild(editor);
        panel = panelEl;
        return panelEl;
    }

    function getElement() {
        return panel ?? buildPanel();
    }

    function focus() {
        editor?.focus();
    }

    return {
        getElement,
        focus,
        downloadAsMarkdown,
        getDraft: loadDraft,
        clearDraft,
    };
}
