const STORAGE_PREFIX = "classes_notepad_";

export function createClassroomNotepad({ classId, i18n }) {
    const storageKey = STORAGE_PREFIX + classId;

    let panel = null;
    let textarea = null;

    function loadDraft() {
        try {
            return sessionStorage.getItem(storageKey) ?? "";
        } catch {
            return "";
        }
    }

    function saveDraft(text) {
        try {
            sessionStorage.setItem(storageKey, text);
        } catch {}
    }

    function clearDraft() {
        try {
            sessionStorage.removeItem(storageKey);
        } catch {}
    }

    function buildPanel() {
        const panelEl = document.createElement("div");
        panelEl.className = "classes-notepad-panel";
        panelEl.setAttribute("role", "complementary");
        panelEl.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad"),
        );

        const header = document.createElement("div");
        header.className = "classes-notepad-header";

        const title = document.createElement("span");
        title.className = "classes-notepad-title";
        title.textContent = i18n.t("module.study.classes.notepad");

        const actions = document.createElement("div");
        actions.className = "classes-notepad-actions";

        const downloadBtn = document.createElement("button");
        downloadBtn.type = "button";
        downloadBtn.className = "classes-notepad-download-btn";
        downloadBtn.textContent = i18n.t(
            "module.study.classes.notepad_download",
        );
        downloadBtn.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad_download"),
        );

        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "classes-notepad-clear-btn";
        clearBtn.textContent = i18n.t("module.study.classes.notepad_clear");
        clearBtn.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad_clear"),
        );

        actions.appendChild(downloadBtn);
        actions.appendChild(clearBtn);
        header.appendChild(title);
        header.appendChild(actions);

        textarea = document.createElement("textarea");
        textarea.className = "classes-notepad-textarea";
        textarea.setAttribute(
            "aria-label",
            i18n.t("module.study.classes.notepad"),
        );
        textarea.setAttribute("spellcheck", "true");
        textarea.value = loadDraft();

        textarea.addEventListener("input", () => {
            saveDraft(textarea.value);
        });

        downloadBtn.addEventListener("click", () => {
            downloadAsMarkdown();
        });

        clearBtn.addEventListener("click", () => {
            textarea.value = "";
            clearDraft();
        });

        panelEl.appendChild(header);
        panelEl.appendChild(textarea);
        panel = panelEl;
        return panelEl;
    }

    function downloadAsMarkdown(className) {
        const text = textarea ? textarea.value : loadDraft();
        const date = new Date().toISOString().slice(0, 10);
        const slug = className
            ? className
                  .replace(/[^a-z0-9]+/gi, "-")
                  .replace(/^-|-$/g, "")
                  .toLowerCase()
            : classId;
        const filename = `${slug}-${date}-notes.md`;
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

    function getElement() {
        return panel ?? buildPanel();
    }

    function focus() {
        textarea?.focus();
    }

    return {
        getElement,
        focus,
        downloadAsMarkdown,
        getDraft: loadDraft,
        clearDraft,
    };
}
