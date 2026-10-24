import path from "node:path";

export function uiStaticPath(
    relative: string,
    staticRoot: string,
    publicRoot: string,
): string {
    const publicAsset =
        relative.startsWith("assets/") ||
        relative.startsWith("templates/") ||
        relative === "recommended-modules.json";
    return path.join(publicAsset ? publicRoot : staticRoot, relative);
}
