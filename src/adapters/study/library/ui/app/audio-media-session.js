import { createI18n } from "/static/reuse/i18n.js";

let activeAudio;
const bound = new WeakSet();

export async function activateLibraryMediaSession(audio, signal) {
    const session = globalThis.navigator?.mediaSession;
    if (!session || !globalThis.MediaMetadata) return;
    const i18n = await createI18n();
    if (signal?.aborted || !audio.isConnected) return;
    activeAudio = audio;
    session.metadata = new MediaMetadata({
        title: audio.dataset.libraryAudioTitle || i18n.t("ui.reuse.brand_name"),
        artist: i18n.t("ui.reuse.brand_name"),
        album: audio.dataset.libraryAudioAlbum || "",
        artwork: [192, 512].map((size) => ({
            src: new URL(
                `/static/assets/icons/cognis-icon-${size}.png`,
                window.location.origin,
            ).href,
            sizes: `${size}x${size}`,
            type: "image/png",
        })),
    });
    session.setActionHandler("play", () => audio.play());
    session.setActionHandler("pause", () => audio.pause());
    session.setActionHandler("stop", () => {
        audio.pause();
        audio.currentTime = 0;
        session.playbackState = "none";
    });
    if (bound.has(audio)) return;
    bound.add(audio);
    const state = (value) => {
        if (activeAudio === audio) session.playbackState = value;
    };
    audio.addEventListener("play", () => state("playing"), { signal });
    audio.addEventListener("pause", () => state("paused"), { signal });
    audio.addEventListener("ended", () => state("none"), { signal });
    signal?.addEventListener(
        "abort",
        () => {
            bound.delete(audio);
            if (activeAudio !== audio) return;
            activeAudio = undefined;
            session.metadata = null;
            session.playbackState = "none";
            for (const action of ["play", "pause", "stop"])
                session.setActionHandler(action, null);
        },
        { once: true },
    );
}
