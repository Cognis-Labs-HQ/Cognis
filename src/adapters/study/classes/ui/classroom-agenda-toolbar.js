export const TOOLBAR_ACTIONS = {
    bold: { before: "**", after: "**" },
    italic: { before: "*", after: "*" },
    strikethrough: { before: "~~", after: "~~" },
    code: { before: "`", after: "`" },
    quote: { prefix: "> " },
    heading: { prefix: "# " },
    heading2: { prefix: "## " },
    heading3: { prefix: "### " },
    codeblock: {
        template: (text) => `\`\`\`\n${text || "code"}\n\`\`\``,
    },
    link: { template: (text) => `[${text || "text"}](url)` },
};

/**
 * @param {object} opts
 * @param {import("/static/reuse/i18n.js").I18n} opts.i18n
 * @returns {string}
 */
export function renderAgendaToolbar({ i18n }) {
    return `
        <div class="classes-agenda-toolbar">
            <select class="classes-agenda-style-select" title="${i18n.t("module.study.classes.agenda_style_label")}">
                <option value="normal">${i18n.t("module.study.classes.agenda_style_normal")}</option>
                <option value="heading1">${i18n.t("module.study.classes.agenda_style_heading1")}</option>
                <option value="heading2">${i18n.t("module.study.classes.agenda_style_heading2")}</option>
                <option value="heading3">${i18n.t("module.study.classes.agenda_style_heading3")}</option>
                <option value="quote">${i18n.t("module.study.classes.agenda_style_quote")}</option>
                <option value="codeblock">${i18n.t("module.study.classes.agenda_style_codeblock")}</option>
            </select>
            <span class="classes-agenda-toolbar-sep"></span>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="bold" title="Bold"><strong>B</strong></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="italic" title="Italic"><em>I</em></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="strikethrough" title="Strikethrough"><s>S</s></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="code" title="Code"><code>&#96;</code></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="codeblock" title="Code Block"><code>&#96;&#96;&#96;</code></button>
            <button type="button" class="classes-agenda-toolbar-btn" data-toolbar-action="link" title="Link">&#128279;</button>
        </div>
    `;
}
