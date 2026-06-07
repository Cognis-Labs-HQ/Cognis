import { EventEmitter } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { RouteRegistry } from "../../reuse/route-registry.js";

type AuthClaims = { sub: string; role: string };

export function createAuthContext(claimsByToken: Map<string, AuthClaims>) {
    return {
        requireAuth(
            req: { headers?: Record<string, string> },
            res: Pick<ServerResponse, "writeHead" | "end">,
        ) {
            const auth = req.headers?.authorization ?? "";
            const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
            const claims = claimsByToken.get(token);
            if (!auth || !auth.startsWith("Bearer ") || !claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Unauthorized",
                        },
                    }),
                );
                return null;
            }
            return claims;
        },
        getCookieSession() {
            const firstClaims = claimsByToken.values().next().value;
            return firstClaims ?? { sub: "calendar-admin", role: "admin" };
        },
        setPageSecurityHeaders() {},
    };
}

export class ResponseRecorder extends EventEmitter {
    statusCode = 0;
    payload = "";
    headers: Record<string, string> = {};

    writeHead(code: number, headers?: Record<string, string>) {
        this.statusCode = code;
        this.headers = {
            ...this.headers,
            ...(headers ?? {}),
        };
    }

    end(chunk?: string | Buffer) {
        if (chunk) {
            this.payload += String(chunk);
        }
        this.emit("close");
    }
}

export class RequestRecorder {
    method: string;
    headers: Record<string, string>;
    private readonly body: string;

    constructor(options: {
        method: string;
        token?: string;
        body?: string;
        headers?: Record<string, string>;
    }) {
        this.method = options.method;
        this.body = options.body ?? "";
        this.headers = {
            ...(options.token
                ? { authorization: "Bearer " + options.token }
                : {}),
            ...(options.headers ?? {}),
        };
    }

    async *[Symbol.asyncIterator]() {
        if (this.body.length > 0) {
            yield Buffer.from(this.body);
        }
    }
}

export async function dispatchRoute(
    routeRegistry: RouteRegistry,
    request: RequestRecorder,
    response: ResponseRecorder,
    url: URL,
) {
    for (const routeEntry of routeRegistry.getEntries()) {
        const handled = await routeEntry.handler(
            request as unknown as IncomingMessage,
            response as unknown as ServerResponse,
            url,
        );
        if (handled) return true;
    }
    response.writeHead(404);
    response.end(JSON.stringify({ error: { code: "not_found" } }));
    return false;
}

export function createJsonDispatcher(routeRegistry: RouteRegistry) {
    return async (
        method: string,
        token: string,
        pathname: string,
        body?: Record<string, unknown>,
    ) => {
        const request = new RequestRecorder({
            method,
            token,
            body: body ? JSON.stringify(body) : undefined,
        });
        const response = new ResponseRecorder();
        await dispatchRoute(
            routeRegistry,
            request,
            response,
            new URL(`http://localhost${pathname}`),
        );
        return {
            statusCode: response.statusCode,
            body:
                response.payload.length > 0 ? JSON.parse(response.payload) : null,
        };
    };
}
