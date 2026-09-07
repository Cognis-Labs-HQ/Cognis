export function createProfileImageSelection() {
    const pendingSelections = new Set();

    function createFileInput() {
        const fileInput = document.createElement("input");
        fileInput.type = "file";
        fileInput.accept = "image/*";
        fileInput.hidden = true;
        document.body.appendChild(fileInput);
        return fileInput;
    }

    function requestSelection(kind, fileInput) {
        if (pendingSelections.has(kind)) return;
        pendingSelections.add(kind);
        window.addEventListener(
            "focus",
            () => {
                window.setTimeout(() => pendingSelections.delete(kind), 0);
            },
            { once: true },
        );
        fileInput.click();
    }

    return {
        avatarFileInput: createFileInput(),
        bannerFileInput: createFileInput(),
        clearPendingSelection: (kind) => pendingSelections.delete(kind),
        requestSelection,
    };
}
