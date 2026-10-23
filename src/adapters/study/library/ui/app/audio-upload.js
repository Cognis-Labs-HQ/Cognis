import { reportClientError } from "/static/reuse/error-reporting.js";
import { uploadLibraryAudio } from "/static/gateways/study/library-client.js";
import { showToast } from "/static/reuse/toast.js";

const LIMIT = 5 * 1024 * 1024;

export function bindAudioUploads(form, i18n, signal) {
    for (const field of form.querySelectorAll("[data-library-audio-upload]")) {
        const picker = field.querySelector('input[type="file"]');
        const button = field.querySelector("[data-library-record-audio]");
        let recorder;
        let stream;
        let discarded = false;
        let pendingPermission = false;
        button.disabled = picker.disabled;
        const release = () =>
            stream?.getTracks().forEach((track) => track.stop());
        const errorToast = (key = "library_audio_upload_error", error) => {
            reportClientError({
                component: "study-library",
                operation: "recordOrUploadAudio",
                code: key,
                errorName: error?.name,
            });
            return showToast(i18n.t(`gateway.study.${key}`), {
                variant: "error",
            });
        };
        async function upload(file) {
            if (signal?.aborted) return;
            if (file.size > LIMIT)
                return errorToast("library_audio_upload_limit");
            field.dataset.uploading = "true";
            picker.disabled = true;
            button.disabled = true;
            try {
                const result = await uploadLibraryAudio(file, signal);
                if (signal?.aborted) return;
                const stored = field.querySelector('input[type="hidden"]');
                stored.value = result.value;
                stored.libraryStagedAudio = file;
                form.dispatchEvent(new Event("change", { bubbles: true }));
                showToast(
                    i18n.t("gateway.study.library_audio_upload_success"),
                    { variant: "success" },
                );
            } catch {
                if (!signal?.aborted) errorToast();
            } finally {
                delete field.dataset.uploading;
                picker.disabled = false;
                button.disabled = false;
            }
        }
        picker.addEventListener(
            "change",
            () => {
                if (picker.files?.[0]) void upload(picker.files[0]);
            },
            { signal },
        );
        button.addEventListener(
            "click",
            async (event) => {
                event.preventDefault();
                if (pendingPermission || button.disabled || signal?.aborted)
                    return;
                if (recorder?.state === "recording") {
                    recorder.stop();
                    return;
                }
                pendingPermission = true;
                field.dataset.uploading = "true";
                picker.disabled = true;
                button.disabled = true;
                button.setAttribute("aria-busy", "true");
                button.setAttribute(
                    "aria-label",
                    i18n.t("gateway.study.library_audio_permission_wait"),
                );
                try {
                    if (!navigator.mediaDevices?.getUserMedia)
                        throw new Error("recording_unavailable");
                    stream = await navigator.mediaDevices.getUserMedia({
                        audio: true,
                    });
                    if (signal?.aborted) {
                        release();
                        return;
                    }
                    if (!globalThis.MediaRecorder)
                        throw new Error("recording_unavailable");
                    const mimeType = [
                        "audio/webm",
                        "audio/ogg",
                        "audio/mp4",
                    ].find((type) => MediaRecorder.isTypeSupported?.(type));
                    recorder = new MediaRecorder(
                        stream,
                        mimeType ? { mimeType } : {},
                    );
                    const chunks = [];
                    let bytes = 0;
                    discarded = false;
                    recorder.addEventListener("dataavailable", ({ data }) => {
                        bytes += data.size;
                        if (bytes > LIMIT && !discarded) {
                            discarded = true;
                            errorToast("library_audio_upload_limit");
                            if (recorder.state === "recording") recorder.stop();
                        }
                        if (!discarded) chunks.push(data);
                    });
                    recorder.addEventListener("error", () => {
                        discarded = true;
                        release();
                        errorToast();
                    });
                    recorder.addEventListener("stop", () => {
                        release();
                        button.setAttribute("aria-pressed", "false");
                        button.setAttribute(
                            "aria-label",
                            i18n.t("gateway.study.library_audio_record"),
                        );
                        delete field.dataset.uploading;
                        picker.disabled = false;
                        if (!discarded && !signal?.aborted && chunks.length) {
                            const type = recorder.mimeType.split(";")[0];
                            void upload(
                                new File(chunks, "recording", { type }),
                            );
                        }
                    });
                    recorder.start(250);
                    field.dataset.uploading = "true";
                    picker.disabled = true;
                    button.setAttribute("aria-pressed", "true");
                    button.setAttribute(
                        "aria-label",
                        i18n.t("gateway.study.library_audio_record_stop"),
                    );
                } catch (error) {
                    release();
                    if (!signal?.aborted)
                        errorToast(
                            error?.name === "NotAllowedError"
                                ? "library_audio_permission_denied"
                                : error?.message === "recording_unavailable"
                                  ? "library_audio_record_unavailable"
                                  : "library_audio_upload_error",
                            error,
                        );
                } finally {
                    pendingPermission = false;
                    button.setAttribute("aria-busy", "false");
                    if (recorder?.state !== "recording") {
                        delete field.dataset.uploading;
                        picker.disabled = false;
                        button.setAttribute(
                            "aria-label",
                            i18n.t("gateway.study.library_audio_record"),
                        );
                    }
                    button.disabled = false;
                }
            },
            { signal },
        );
        signal?.addEventListener(
            "abort",
            () => {
                discarded = true;
                if (recorder?.state === "recording") recorder.stop();
                release();
            },
            { once: true },
        );
    }
}
