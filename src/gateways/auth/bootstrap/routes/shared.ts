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

export interface LoginFlowSessionResult {
    outcome: string;
    accountId?: string;
    displayName?: string;
    provider?: string;
    providerId?: string;
    role?: string;
    isFounder?: boolean;
    token?: string;
    ttlSeconds?: number | null;
    loginAttemptId?: string;
    methods?: unknown[];
    userValidationMode?: string;
    requiredUserValidation?: unknown;
}
