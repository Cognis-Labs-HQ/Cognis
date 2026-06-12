const TOOLBAR_ACTIONS = {
    bold: { before: "**", after: "**" },
    italic: { before: "*", after: "*" },
    strikethrough: { before: "~~", after: "~~" },
    code: { before: "`", after: "`" },
    quote: { prefix: "> " },
    heading: { prefix: "# " },
    link: { template: (text) => `[${text || "text"}](url)` },
};

export function renderAgendaToolbar() {
    return `
        <div class="classes-agenda-toolbar">
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="bold" title="Bold"><strong>B</strong></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="italic" title="Italic"><em>I</em></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="strikethrough" title="Strikethrough">~~</button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="code" title="Code">&#96;</button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="quote" title="Quote">&gt;</button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="heading" title="Heading">#</button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="link" title="Link">&#128279;</button>
        </div>
    `;
}

export function bindAgendaToolbar(container, textarea) {
    const toolbar = container?.querySelector(".classes-agenda-toolbar");
    if (!toolbar || !(textarea instanceof HTMLTextAreaElement)) return;
    toolbar.addEventListener("click", (event) => {
        const button = event.target.closest(".classes-agenda-toolbar-btn");
        if (!(button instanceof HTMLElement)) return;
        const action = button.dataset.toolbarAction ?? "";
        const handler = TOOLBAR_ACTIONS[action];
        if (!handler) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.slice(start, end);
        const before = textarea.value.slice(0, start);
        const after = textarea.value.slice(end);
        let insertion;
        if (handler.template) {
            insertion = handler.template(selectedText);
        } else if (handler.prefix) {
            insertion = handler.prefix + selectedText;
        } else {
            insertion = handler.before + selectedText + handler.after;
        }
        textarea.value = before + insertion + after;
        const cursorPos = handler.template
            ? start + insertion.length
            : handler.prefix
              ? start + handler.prefix.length + selectedText.length
              : start + handler.before.length + selectedText.length;
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
        textarea.dispatchEvent(new Event("input", { bubbles: true }));
    });
}
