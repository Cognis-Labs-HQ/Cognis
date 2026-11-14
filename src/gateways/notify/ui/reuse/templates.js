/**
 * Load Notify-owned markup without parsing or interpolating its data tokens.
 * @param {string[]} names Owned template filenames without extensions.
 * @returns {Promise<Record<string, string>>} Raw markup keyed by template name.
 */
export async function loadAdminTemplates(names) {
    const entries = await Promise.all(
        names.map(async (name) => {
            const response = await fetch(
                `/static/gateways/notify/templates/${name}.html`,
            );
            if (!response.ok)
                throw new Error("notify_admin_template_failed:" + name);
            const markup = await response.text();
            if (!markup.trim())
                throw new Error("notify_admin_template_missing:" + name);
            return [name, markup];
        }),
    );
    return Object.fromEntries(entries);
}
