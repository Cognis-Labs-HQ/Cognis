export function createProfileImageSelection({ onFileSelected, onError }) {
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

    const inputs = {
        avatarFileInput: createFileInput(),
        bannerFileInput: createFileInput(),
    };
    for (const [kind, input] of [
        ["avatar", inputs.avatarFileInput],
        ["banner", inputs.bannerFileInput],
    ]) {
        input.addEventListener("change", async () => {
            const file = input.files?.[0];
            try {
                if (file) await onFileSelected(kind, file);
            } catch (error) {
                onError(error);
            } finally {
                input.value = "";
                pendingSelections.delete(kind);
            }
        });
    }
    return {
        ...inputs,
        clearPendingSelection: (kind) => pendingSelections.delete(kind),
        requestSelection,
    };
}
