import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { RouteHandler } from "../reuse/route-registry.js";

export interface ComponentResponse {
    status: number;
    data?: unknown;
    error?: { code?: string; message?: string };
    meta?: unknown;
}

/** Runs the existing authenticated management contracts without a loopback network request. */
export type ComponentTransport = (
    request: IncomingMessage,
    pathname: string,
    method?: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
) => Promise<ComponentResponse>;

export function createComponentTransport(
    handlers: () => readonly RouteHandler[],
): ComponentTransport {
    return async (
        request: IncomingMessage,
        pathname: string,
        method = "GET",
        body?: unknown,
        extraHeaders: Record<string, string> = {},
    ): Promise<ComponentResponse> => {
        if (
            !/^\/api\/v1\/(?:modules|gateways)(?:\/|$)/.test(pathname) ||
            /[?#]/.test(pathname)
        )
            throw new Error("invalid_component_route");
        const bytes =
            body === undefined ? undefined : Buffer.from(JSON.stringify(body));
        const forwarded = Readable.from(
            bytes ? [bytes] : [],
        ) as IncomingMessage;
        forwarded.method = method;
        forwarded.url = pathname;
        forwarded.headers = {
            ...request.headers,
            ...extraHeaders,
            ...(bytes
                ? {
                      "content-type": "application/json",
                      "content-length": String(bytes.length),
                  }
                : {}),
        };
        forwarded.socket = request.socket;
        let status = 200;
        const chunks: Buffer[] = [];
        const headers = new Map<string, unknown>();
        const response = {
            setHeader(name: string, value: unknown) {
                headers.set(name.toLowerCase(), value);
                return this;
            },
            getHeader(name: string) {
                return headers.get(name.toLowerCase());
            },
            removeHeader(name: string) {
                headers.delete(name.toLowerCase());
            },
            writeHead(code: number, values?: Record<string, unknown>) {
                status = code;
                for (const [name, value] of Object.entries(values ?? {}))
                    headers.set(name.toLowerCase(), value);
                return this;
            },
            write(chunk: string | Buffer) {
                chunks.push(Buffer.from(chunk));
                return true;
            },
            end(chunk?: string | Buffer) {
                if (chunk) chunks.push(Buffer.from(chunk));
                return this;
            },
        } as unknown as ServerResponse;
        for (const handler of handlers()) {
            if (
                await handler(
                    forwarded,
                    response,
                    new URL(pathname, "http://component.internal"),
                )
            ) {
                const text = Buffer.concat(chunks).toString("utf8");
                const payload = text
                    ? (JSON.parse(text) as Omit<ComponentResponse, "status">)
                    : {};
                return { ...payload, status };
            }
        }
        return {
            status: 404,
            error: { code: "component_operation_unavailable" },
        };
    };
}

export function checked(response: ComponentResponse): unknown {
    if (response.status >= 400)
        throw Object.assign(
            new Error(response.error?.code ?? "component_operation_failed"),
            {
                code: response.error?.code ?? "component_operation_failed",
                status: response.status,
            },
        );
    return response.data;
}
