let currentCardId = null;
const listeners = new Set();

export function observeDrawingCard(listener, { signal } = {}) {
    if (signal?.aborted) return () => {};
    listeners.add(listener);
    listener(currentCardId);
    const release = () => {
        listeners.delete(listener);
        signal?.removeEventListener("abort", release);
    };
    signal?.addEventListener("abort", release, { once: true });
    return release;
}

export function setDrawingCard(cardId) {
    currentCardId = cardId;
    for (const listener of listeners) listener(cardId);
}
