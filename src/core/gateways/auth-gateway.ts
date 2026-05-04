export interface AuthContext {
    accountId: string;
    provider: string;
    externalUserId: string;
    email?: string;
    isAdmin?: boolean;
    role?: string;
}

export interface AuthGateway {
    authenticate(token: string): Promise<AuthContext | null>;
    createLocalAdmin(username: string, password: string): Promise<AuthContext>;
}
