const TONE_INTERVAL_MILLISECONDS = 2_000;

export function startRingingTone(direction) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return () => {};
    const context = new AudioContext();
    let stopped = false;

    const playPulse = async () => {
        if (stopped) return;
        await context.resume();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = direction === "inbound" ? 440 : 425;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.16,
            context.currentTime + 0.02,
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.6,
        );
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.65);
    };

    void playPulse().catch(() => undefined);
    const interval = window.setInterval(
        () => void playPulse().catch(() => undefined),
        TONE_INTERVAL_MILLISECONDS,
    );
    return () => {
        if (stopped) return;
        stopped = true;
        window.clearInterval(interval);
        void context.close();
    };
}
