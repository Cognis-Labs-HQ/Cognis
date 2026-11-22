export function installI18nEnvironment(respond) {
    const storage = new Map();
    const requests = [];
    globalThis.localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
    };
    const events = new EventTarget();
    globalThis.window = {
        addEventListener: events.addEventListener.bind(events),
        dispatchEvent: events.dispatchEvent.bind(events),
        location: { origin: "https://cognis.test" },
    };
    globalThis.document = { cookie: "", documentElement: { lang: "de" } };
    globalThis.DOMParser = class {
        parseFromString(xml) {
            return {
                documentElement: {
                    nodeName: /^\s*<resources[>\s]/.test(xml)
                        ? "resources"
                        : "html",
                },
                querySelector: () => null,
                querySelectorAll: () =>
                    [
                        ...xml.matchAll(
                            /<string name="([^"]+)">([^<]*)<\/string>/g,
                        ),
                    ].map((match) => ({
                        getAttribute: () => match[1],
                        textContent: match[2],
                    })),
            };
        }
    };
    globalThis.fetch = async (path, options) => {
        requests.push({ path, options });
        return respond(path, options);
    };
    return { storage, requests };
}
