/**
 * Loads the classroom meeting embed and whiteboard window factories from the
 * URLs injected by the server via meta tags. Returns null for each factory
 * when the corresponding module is absent or fails to load, allowing the
 * classroom to degrade gracefully without those features.
 *
 * Public exports:
 *   - `loadMeetingEmbedFactory()` — loads `createClassroomMeetingEmbed` from
 *     the `classroom-meeting-embed-script` meta tag, or returns null.
 *   - `loadWhiteboardWindowFactory()` — loads `createClassroomWhiteboardWindow`
 *     from the `classroom-whiteboard-window-script` meta tag, or returns null.
 *
 * Usage:
 *   ```js
 *   const createMeetingEmbed = await loadMeetingEmbedFactory();
 *   const createWhiteboardWindow = await loadWhiteboardWindowFactory();
 *   const windows = createClassroomWindows({ ..., createMeetingEmbed, createWhiteboardWindow });
 *   ```
 *
 * @returns {Promise<Function|null>}
 */

/**
 * Loads both optional classroom window factories in parallel. Returns null
 * for each when the corresponding module meta tag is absent or the script
 * fails to load.
 *
 * @returns {Promise<{ createMeetingEmbed: Function|null, createWhiteboardWindow: Function|null }>}
 */
export async function loadWindowsFactories() {
    const [createMeetingEmbed, createWhiteboardWindow] = await Promise.all([
        loadMeetingEmbedFactory(),
        loadWhiteboardWindowFactory(),
    ]);
    return { createMeetingEmbed, createWhiteboardWindow };
}

/**
 * Loads the `createClassroomMeetingEmbed` factory from the URL in the
 * `classroom-meeting-embed-script` meta tag. Returns null when the tag is
 * absent or the module script fails to load.
 *
 * @returns {Promise<Function|null>}
 */
export async function loadMeetingEmbedFactory() {
    const scriptMeta = document.querySelector(
        'meta[name="classroom-meeting-embed-script"]',
    );
    const scriptUrl = scriptMeta?.content?.trim() ?? "";
    if (!scriptUrl) return null;
    try {
        const factory = (await import(scriptUrl)).createClassroomMeetingEmbed;
        if (typeof factory !== "function") {
            console.error(
                "[classroom] Meeting embed module did not export createClassroomMeetingEmbed.",
                { operation: "importMeetingEmbedScript", url: scriptUrl },
            );
            return null;
        }
        return factory;
    } catch (err) {
        console.error("[classroom] Failed to load meeting embed module.", {
            operation: "importMeetingEmbedScript",
            url: scriptUrl,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}

/**
 * Loads the `createClassroomWhiteboardWindow` factory from the URL in the
 * `classroom-whiteboard-window-script` meta tag. Returns null when the tag is
 * absent or the module script fails to load.
 *
 * @returns {Promise<Function|null>}
 */
export async function loadWhiteboardWindowFactory() {
    const scriptMeta = document.querySelector(
        'meta[name="classroom-whiteboard-window-script"]',
    );
    const scriptUrl = scriptMeta?.content?.trim() ?? "";
    if (!scriptUrl) return null;
    try {
        const factory = (await import(scriptUrl))
            .createClassroomWhiteboardWindow;
        if (typeof factory !== "function") {
            console.error(
                "[classroom] Whiteboard window module did not export createClassroomWhiteboardWindow.",
                { operation: "importWhiteboardWindowScript", url: scriptUrl },
            );
            return null;
        }
        return factory;
    } catch (err) {
        console.error("[classroom] Failed to load whiteboard window module.", {
            operation: "importWhiteboardWindowScript",
            url: scriptUrl,
            error: err instanceof Error ? err.message : String(err),
        });
        return null;
    }
}
