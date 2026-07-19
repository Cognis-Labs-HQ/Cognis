export function resolveExpiry(hoursValue) {
    if (
        hoursValue === null ||
        hoursValue === undefined ||
        String(hoursValue).trim() === ""
    ) {
        return "";
    }
    const parsed = Number(hoursValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return new Date(Date.now() + parsed * 60 * 60 * 1000).toISOString();
}

export function publicConfig(config) {
    return {
        serverUrl: config.serverUrl,
        imageUploadMaxBytes: config.imageUploadMaxBytes,
        apiKeyConfigured: config.apiKeyConfigured,
        updatedAt: config.updatedAt,
    };
}
