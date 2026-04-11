export interface AuthContext {
  provider: string;
  externalUserId: string;
  email?: string;
  isAdmin?: boolean;
}

export interface AuthGateway {
  authenticate(token: string): Promise<AuthContext | null>;
  createLocalAdmin(username: string, password: string): Promise<void>;
}
