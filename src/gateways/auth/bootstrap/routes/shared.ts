import type { IncomingMessage, ServerResponse } from "node:http";

export interface AuthRouteLogMeta {
    component: string;
    method: string;
    path: string;
    [key: string]: unknown;
}

export type AuthGatewayRouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    logMeta: AuthRouteLogMeta,
) => Promise<boolean>;
