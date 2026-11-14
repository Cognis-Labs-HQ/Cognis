export function installEditorDocument(context) {
    const previous = globalThis.document;
    const controls = new Map();
    const document = {
        defaultView: { innerHeight: 700 },
        body: { appendChild() {} },
        createElement: () => ({
            ownerDocument: document,
            style: { setProperty() {} },
            getBoundingClientRect: () => ({ height: 240 }),
            querySelector: (selector) => {
                if (selector === "#composer-panel-drag-handle") return null;
                if (!controls.has(selector))
                    controls.set(selector, new EventTarget());
                return controls.get(selector);
            },
            querySelectorAll(selector) {
                if (selector !== "[data-composer-panel-item]") return [];
                return [
                    ...this.innerHTML.matchAll(
                        /data-composer-panel-item="([^"]+)"/g,
                    ),
                ].map(([, id]) => {
                    const button = new EventTarget();
                    controls.set(id, button);
                    return {
                        dataset: { composerPanelItem: id },
                        querySelector: (value) =>
                            value === ".composer-add-btn" ? button : null,
                    };
                });
            },
        }),
    };
    globalThis.document = document;
    context.after(() => {
        globalThis.document = previous;
    });
    return controls;
}
