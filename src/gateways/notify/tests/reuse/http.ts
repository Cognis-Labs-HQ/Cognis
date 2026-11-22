import {
    IncomingMessage,
    ServerResponse,
    type IncomingHttpHeaders,
} from "node:http";
import { Socket } from "node:net";

export function createRequest(
    input: {
        method?: string;
        headers?: IncomingHttpHeaders;
        [Symbol.asyncIterator]?: () => AsyncIterableIterator<Buffer>;
    } = {},
): IncomingMessage {
    const request = new IncomingMessage(new Socket());
    Object.assign(request, input);
    if (!input[Symbol.asyncIterator]) request.push(null);
    return request;
}

export function createResponse<
    T extends {
        writeHead(code: number, headers?: Record<string, string>): void;
        end(data: string): void;
    },
>(observer: T): ServerResponse & Omit<T, "writeHead" | "end"> {
    const response: ServerResponse = new ServerResponse(createRequest());
    response.writeHead = (
        code: number,
        reasonOrHeaders?:
            | string
            | import("node:http").OutgoingHttpHeaders
            | import("node:http").OutgoingHttpHeader[],
        headers?:
            | import("node:http").OutgoingHttpHeaders
            | import("node:http").OutgoingHttpHeader[],
    ) => {
        response.statusCode = code;
        const values =
            typeof reasonOrHeaders === "string" ? headers : reasonOrHeaders;
        const stringHeaders: Record<string, string> = {};
        if (values && !Array.isArray(values)) {
            for (const [key, value] of Object.entries(values)) {
                if (value !== undefined) stringHeaders[key] = String(value);
            }
        }
        observer.writeHead(code, stringHeaders);
        return response;
    };
    response.end = (chunk?: unknown) => {
        observer.end(chunk == null ? "" : String(chunk));
        return response;
    };
    // Keep observation getters live while retaining real HTTP methods.
    for (const key of Object.keys(observer)) {
        const descriptor = Object.getOwnPropertyDescriptor(observer, key);
        if (descriptor && key !== "writeHead" && key !== "end")
            Object.defineProperty(response, key, descriptor);
    }
    return response as ServerResponse & Omit<T, "writeHead" | "end">;
}
