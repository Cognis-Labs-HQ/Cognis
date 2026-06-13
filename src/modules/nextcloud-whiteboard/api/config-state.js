import { normalizeHttpUrl } from "../../../api/reuse/url-parts.js";

const DEFAULT_TOKEN_EXPIRY_SECONDS = 3600;
const MIN_TOKEN_EXPIRY_SECONDS = 60;
const MAX_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60;

let config = {
    whiteboardUrl: "",
    whiteboardSecret: "",
    tokenExpirySeconds: DEFAULT_TOKEN_EXPIRY_SECONDS,
};

export function normalizeTokenExpirySeconds(value) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) {
        return DEFAULT_TOKEN_EXPIRY_SECONDS;
    }
    const flooredValue = Math.floor(numericValue);
    if (flooredValue < MIN_TOKEN_EXPIRY_SECONDS) {
        return MIN_TOKEN_EXPIRY_SECONDS;
    }
    if (flooredValue > MAX_TOKEN_EXPIRY_SECONDS) {
        return MAX_TOKEN_EXPIRY_SECONDS;
    }
    return flooredValue;
}

export function normalizeWhiteboardConfig(input = {}) {
    const whiteboardUrl = normalizeHttpUrl(input.whiteboardUrl) ?? "";
    const whiteboardSecret = String(input.whiteboardSecret ?? "").trim();
    const tokenExpirySeconds = normalizeTokenExpirySeconds(
        input.tokenExpirySeconds,
    );
    return {
        whiteboardUrl,
        whiteboardSecret,
        tokenExpirySeconds,
    };
}

export function setWhiteboardConfig(nextConfig = {}) {
    config = normalizeWhiteboardConfig(nextConfig);
    return getWhiteboardConfig();
}

export function getWhiteboardConfig() {
    return { ...config };
}
