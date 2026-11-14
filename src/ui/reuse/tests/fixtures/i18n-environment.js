export function installI18nEnvironment(respond) {
    const storage = new Map();
    const requests = [];
    globalThis.localStorage = {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
    };
    globalThis.window = {
        location: { origin: "https://cognis.test" },
        dispatchEvent() {},
    };
    globalThis.document = { cookie: "", documentElement: { lang: "de" } };
    globalThis.DOMParser = class {
        parseFromString(xml) {
            return {
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
