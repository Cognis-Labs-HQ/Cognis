export const TOOLBAR_ACTIONS = {
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
