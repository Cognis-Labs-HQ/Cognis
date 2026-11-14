export function createProfileImageSelection({
    onFileSelected,
    onError,
    signal,
    isCurrent,
}) {
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
        if (!isCurrent() || pendingSelections.has(kind)) return;
        pendingSelections.add(kind);
        window.addEventListener(
            "focus",
            () => {
                window.setTimeout(() => pendingSelections.delete(kind), 0);
            },
            { once: true, signal },
        );
        fileInput.click();
    }

    const inputs = {
        avatarFileInput: createFileInput(),
        bannerFileInput: createFileInput(),
    };
    for (const [kind, input] of [
        ["avatar", inputs.avatarFileInput],
        ["banner", inputs.bannerFileInput],
    ]) {
        input.addEventListener(
            "change",
            async () => {
                if (!isCurrent()) return;
                const file = input.files?.[0];
                try {
                    if (file) await onFileSelected(kind, file);
                } catch (error) {
                    if (error?.code === "missing_translation") throw error;
                    onError(error);
                } finally {
                    input.value = "";
                    pendingSelections.delete(kind);
                }
            },
            { signal },
        );
    }
    return {
        ...inputs,
        dispose: () => {
            pendingSelections.clear();
            for (const input of Object.values(inputs)) input.remove();
        },
        requestSelection,
    };
}
