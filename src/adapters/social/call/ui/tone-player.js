const TONE_INTERVAL_MILLISECONDS = 3_200;
const BURST_GAP_MILLISECONDS = 260;

export function startRingingTone(direction) {
    const AudioContext = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContext) return () => {};
    const context = new AudioContext();
    let stopped = false;

    const playPulse = async (delay = 0) => {
        if (stopped) return;
        await context.resume();
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (stopped) return;
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
            context.currentTime + 0.9,
        );
        oscillator.connect(gain).connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.95);
    };

    const playRing = () => {
        void playPulse().catch(() => undefined);
        void playPulse(BURST_GAP_MILLISECONDS).catch(() => undefined);
    };
    playRing();
    const interval = window.setInterval(playRing, TONE_INTERVAL_MILLISECONDS);
    return () => {
        if (stopped) return;
        stopped = true;
        window.clearInterval(interval);
        void context.close();
    };
}
