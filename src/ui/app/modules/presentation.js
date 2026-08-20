export function formatVersion(version) {
    const normalized = String(version ?? "").replace(/^v/, "");
    return normalized ? `v${normalized}` : "";
}

export function detailModuleUuid(pathname = window.location.pathname) {
    const match = pathname.match(/^\/administration\/modules\/([^/]+)\/?$/);
    return match ? decodeURIComponent(match[1]) : null;
}
