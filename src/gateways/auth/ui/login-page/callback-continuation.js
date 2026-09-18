function readCallbackParameters(location) {
    const fragment = location.hash.replace(/^#\??/, "");
    if (!fragment) return null;
    const parameters = new URLSearchParams(fragment);
    if (!parameters.has("code") && !parameters.has("error")) return null;
    return parameters;
}

export function resolveCallbackContinuation(location) {
    const parameters = readCallbackParameters(location);
    if (!parameters) return null;
    const query = parameters.toString();
    return query ? `${location.pathname}?${query}` : null;
}
