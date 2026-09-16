/**
 * Core contracts for the authentication gateway surface.
 *
 * These types define the cross-component API for authentication. Gateway
 * implementations and adapters must implement/consume these interfaces rather
 * than importing each other's internal types directly.
 */

/** Role level assigned to an authenticated session or access token. */
export type AccessRole = "user" | "teacher" | "moderator" | "admin" | "owner";

export interface AuthContext {
    accountId: string;
    provider: string;
    externalUserId: string;
    email?: string;
    role?: string;
}

export interface AuthGateway {
    authenticate(token: string): Promise<AuthContext | null>;
    createLocalAdmin(username: string, password: string): Promise<AuthContext>;
}
