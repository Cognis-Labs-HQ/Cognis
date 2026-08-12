export function debounce(callback, delay) {
    let timer = null;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => callback(...args), delay);
    };
}

export function throttleLatest(callback, delay) {
    let timer = null;
    let lastArgs = null;
    return (...args) => {
        lastArgs = args;
        if (timer) return;
        timer = setTimeout(() => {
            timer = null;
            if (lastArgs) {
                const pendingArgs = lastArgs;
                lastArgs = null;
                callback(...pendingArgs);
            }
        }, delay);
    };
}

export function loadSocketIo(serverUrl, failureMessage) {
    return new Promise((resolve, reject) => {
        if (window.io) {
            resolve(window.io);
            return;
        }
        const origin = new URL(serverUrl).origin;
        const script = document.createElement("script");
        const timeout = window.setTimeout(() => {
            script.remove();
            reject(new Error(failureMessage));
        }, 10_000);
        script.async = true;
        script.src = `${origin}/socket.io/socket.io.js`;
        script.onload = () => {
            window.clearTimeout(timeout);
            resolve(window.io);
        };
        script.onerror = () => {
            window.clearTimeout(timeout);
            script.remove();
            reject(new Error(failureMessage));
        };
        document.head.appendChild(script);
    });
}

export function encodeSyncMessage(type, payload = {}) {
    return new TextEncoder().encode(JSON.stringify({ type, payload }));
}

export function encodeSceneMessage(type, elements) {
    return encodeSyncMessage(type, { elements });
}

export function decodeSceneMessage(payload) {
    const text =
        typeof payload === "string"
            ? payload
            : new TextDecoder().decode(
                  payload instanceof Uint8Array
                      ? payload
                      : new Uint8Array(payload),
              );
    return JSON.parse(text);
}
