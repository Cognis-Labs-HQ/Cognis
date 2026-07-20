import { readFile } from "node:fs/promises";

export class ApiRequestError extends Error {
    constructor(
        readonly status: number,
        readonly statusText: string,
        readonly payload: unknown,
    ) {
        super(
            `API request failed (${status} ${statusText}): ${typeof payload === "string" ? payload : JSON.stringify(payload)}`,
        );
    }
}

function buildHeaders(
    apiToken?: string,
    includeJsonContentType = false,
): Record<string, string> | undefined {
    const headers: Record<string, string> = {};
    if (includeJsonContentType) headers["content-type"] = "application/json";
    if (apiToken) headers.authorization = "Bearer " + apiToken;
    return Object.keys(headers).length > 0 ? headers : undefined;
}

export async function apiRequest(
    apiBaseUrl: string,
    route: string,
    options?: { method?: string; body?: unknown; apiToken?: string },
): Promise<unknown> {
    const method = options?.method ?? "GET";
    const body = options?.body;
    const response = await fetch(`${apiBaseUrl}${route}`, {
        method,
        headers: buildHeaders(options?.apiToken, body !== undefined),
        body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

    if (!response.ok) {
        throw new ApiRequestError(
            response.status,
            response.statusText,
            payload,
        );
    }

    return payload;
}

export async function apiGet(
    apiBaseUrl: string,
    route: string,
    apiToken?: string,
): Promise<unknown> {
    return apiRequest(apiBaseUrl, route, { method: "GET", apiToken });
}

export async function apiPost(
    apiBaseUrl: string,
    route: string,
    body?: unknown,
    apiToken?: string,
): Promise<unknown> {
    return apiRequest(apiBaseUrl, route, { method: "POST", body, apiToken });
}

export async function apiPut(
    apiBaseUrl: string,
    route: string,
    body?: unknown,
    apiToken?: string,
): Promise<unknown> {
    return apiRequest(apiBaseUrl, route, { method: "PUT", body, apiToken });
}

export async function resolveCliToken(): Promise<string> {
    const tokenPath =
        process.env.COGNIS_CLI_TOKEN_PATH ?? "/app/config/cli-access.token";
    const token = (await readFile(tokenPath, "utf8")).trim();
    if (!token) throw new Error("CLI access token file is empty");
    return token;
}
