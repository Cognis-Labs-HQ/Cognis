import type { AuthContext } from "@cognis/core";
import type {
    AuthAdapterRouteContext,
    AuthConfigField,
    AuthProviderAdapter,
} from "../../../gateways/auth/gateway.js";

type LifecycleState = "active" | "unlinked" | "deactivated" | "deleted";

interface LineTokenResponse {
    access_token?: string;
    id_token?: string;
}

export interface LineProfile {
    userId: string;
    displayName?: string;
    pictureUrl?: string;
    status?: string;
}

interface LineIdTokenClaims {
    sub?: string;
    name?: string;
    picture?: string;
    email?: string;
}

export interface LineAuthClient {
    exchangeAuthorizationCode(input: {
        authorizationCode: string;
        codeVerifier?: string;
        redirectUri: string;
        channelId: string;
        channelSecret: string;
    }): Promise<LineTokenResponse | null>;
    fetchProfile(accessToken: string): Promise<LineProfile | null>;
    verifyIdToken(
        idToken: string,
        channelId: string,
    ): Promise<LineIdTokenClaims | null>;
}

function normalizeLifecycleState(input: unknown): LifecycleState {
    if (input === "unlinked") return "unlinked";
    if (input === "deactivated") return "deactivated";
    if (input === "deleted") return "deleted";
    return "active";
}

class LineHttpClient implements LineAuthClient {
    constructor(
        private readonly getConfig: () => {
            tokenEndpoint: string;
            profileEndpoint: string;
            verifyIdTokenEndpoint: string;
            usePkce: boolean;
        },
    ) {}

    async exchangeAuthorizationCode(input: {
        authorizationCode: string;
        codeVerifier?: string;
        redirectUri: string;
        channelId: string;
        channelSecret: string;
    }): Promise<LineTokenResponse | null> {
        const config = this.getConfig();
        const params = new URLSearchParams();
        params.set("grant_type", "authorization_code");
        params.set("code", input.authorizationCode);
        params.set("redirect_uri", input.redirectUri);
        params.set("client_id", input.channelId);
        if (input.channelSecret) {
            params.set("client_secret", input.channelSecret);
        }
        if (config.usePkce) {
            if (!input.codeVerifier || !input.codeVerifier.trim()) {
                return null;
            }
            params.set("code_verifier", input.codeVerifier);
        }
        const response = await fetch(config.tokenEndpoint, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: params,
        }).catch(() => null);
        if (!response || !response.ok) {
            return null;
        }
        const payload = (await response
            .json()
            .catch(() => null)) as LineTokenResponse | null;
        if (!payload) return null;
        return payload;
    }

    async fetchProfile(accessToken: string): Promise<LineProfile | null> {
        const config = this.getConfig();
        const response = await fetch(config.profileEndpoint, {
            headers: {
                authorization: `Bearer ${accessToken}`,
            },
        }).catch(() => null);
        if (!response || !response.ok) return null;
        return (await response.json().catch(() => null)) as LineProfile | null;
    }

    async verifyIdToken(
        idToken: string,
        channelId: string,
    ): Promise<LineIdTokenClaims | null> {
        const config = this.getConfig();
        const params = new URLSearchParams();
        params.set("id_token", idToken);
        params.set("client_id", channelId);
        const response = await fetch(config.verifyIdTokenEndpoint, {
            method: "POST",
            headers: {
                "content-type": "application/x-www-form-urlencoded",
            },
            body: params,
        }).catch(() => null);
        if (!response || !response.ok) return null;
        return (await response
            .json()
            .catch(() => null)) as LineIdTokenClaims | null;
    }
}

class LineAuthAdapter implements AuthProviderAdapter {
    readonly id = "line";
    readonly name = "LINE Messenger SSO";
    private readonly managedRedirectPath = "/auth/line/callback";

    private providerName = "line";
    private channelId = "";
    private channelSecret = "";
    private redirectUri = "";
    private tokenEndpoint = "https://api.line.me/oauth2/v2.1/token";
    private profileEndpoint = "https://api.line.me/v2/profile";
    private verifyIdTokenEndpoint = "https://api.line.me/oauth2/v2.1/verify";
    private accountIdPrefix = "line";
    private usePkce = true;
    private client: LineAuthClient;

    constructor() {
        this.client = new LineHttpClient(() => ({
            tokenEndpoint: this.tokenEndpoint,
            profileEndpoint: this.profileEndpoint,
            verifyIdTokenEndpoint: this.verifyIdTokenEndpoint,
            usePkce: this.usePkce,
        }));
    }

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        if (!this.channelId) {
            return null;
        }

        let accessToken = String(credentials.accessToken ?? "");
        let idToken = String(credentials.idToken ?? "");

        if (!accessToken && !idToken) {
            const authorizationCode = String(
                credentials.authorizationCode ?? "",
            );
            if (!authorizationCode) {
                return null;
            }
            const tokenResult = await this.client.exchangeAuthorizationCode({
                authorizationCode,
                codeVerifier: String(credentials.codeVerifier ?? ""),
                redirectUri:
                    String(credentials.redirectUri ?? "") || this.redirectUri,
                channelId: this.channelId,
                channelSecret: this.channelSecret,
            });
            if (!tokenResult) {
                return null;
            }
            accessToken = String(tokenResult.access_token ?? "");
            idToken = String(tokenResult.id_token ?? "");
        }

        let profile: LineProfile | null = null;
        if (accessToken) {
            profile = await this.client.fetchProfile(accessToken);
        }
        let idTokenClaims: LineIdTokenClaims | null = null;
        if (idToken) {
            idTokenClaims = await this.client.verifyIdToken(
                idToken,
                this.channelId,
            );
        }
        const externalUserId = String(
            profile?.userId ?? idTokenClaims?.sub ?? "",
        ).trim();
        if (!externalUserId) {
            return null;
        }
        const displayName = String(
            profile?.displayName ?? idTokenClaims?.name ?? externalUserId,
        ).trim();
        const profileImageUrl = String(
            profile?.pictureUrl ?? idTokenClaims?.picture ?? "",
        ).trim();
        const lifecycleState = normalizeLifecycleState(
            profile?.status ?? credentials.lifecycleState,
        );

        return {
            accountId: `${this.accountIdPrefix}:${externalUserId}`,
            provider: this.providerName,
            externalUserId,
            email: idTokenClaims?.email,
            displayName: displayName || externalUserId,
            profileImageUrl: profileImageUrl || undefined,
            lifecycleState,
            isAdmin: false,
            role: "user",
        };
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "providerName",
                label: "Provider Name",
                type: "text",
                required: false,
            },
            {
                key: "channelId",
                label: "LINE Channel ID",
                hint: "Your LINE Login channel ID, found in the LINE Developers Console under your channel's Basic settings.",
                type: "text",
                required: true,
                envVar: "LINE_CHANNEL_ID",
            },
            {
                key: "channelSecret",
                label: "LINE Channel Secret",
                type: "password",
                required: false,
                envVar: "LINE_CHANNEL_SECRET",
            },
            {
                key: "usePkce",
                label: "Use PKCE (required for mobile/web clients)",
                type: "boolean",
                required: false,
                envVar: "LINE_USE_PKCE",
            },
            {
                key: "accountIdPrefix",
                label: "Account ID Prefix",
                type: "text",
                required: false,
            },
            {
                key: "tokenEndpoint",
                label: "Token Endpoint",
                type: "text",
                required: false,
            },
            {
                key: "profileEndpoint",
                label: "Profile Endpoint",
                type: "text",
                required: false,
            },
            {
                key: "verifyIdTokenEndpoint",
                label: "ID Token Verify Endpoint",
                type: "text",
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        if (typeof config.providerName === "string" && config.providerName) {
            this.providerName = config.providerName;
        }
        if (typeof config.channelId === "string") {
            this.channelId = config.channelId.trim();
        }
        if (typeof config.channelSecret === "string") {
            this.channelSecret = config.channelSecret.trim();
        }
        if (typeof config.redirectUri === "string") {
            this.redirectUri = config.redirectUri.trim();
        }
        if (typeof config.usePkce === "boolean") {
            this.usePkce = config.usePkce;
        } else if (typeof config.usePkce === "string") {
            this.usePkce = config.usePkce === "true";
        }
        if (
            typeof config.accountIdPrefix === "string" &&
            config.accountIdPrefix
        ) {
            this.accountIdPrefix = config.accountIdPrefix.trim();
        }
        if (typeof config.tokenEndpoint === "string" && config.tokenEndpoint) {
            this.tokenEndpoint = config.tokenEndpoint.trim();
        }
        if (
            typeof config.profileEndpoint === "string" &&
            config.profileEndpoint
        ) {
            this.profileEndpoint = config.profileEndpoint.trim();
        }
        if (
            typeof config.verifyIdTokenEndpoint === "string" &&
            config.verifyIdTokenEndpoint
        ) {
            this.verifyIdTokenEndpoint = config.verifyIdTokenEndpoint.trim();
        }
    }

    setClient(client: LineAuthClient): void {
        this.client = client;
    }

    getManagedRedirectPath(): string {
        return this.managedRedirectPath;
    }

    registerRoutes(context: AuthAdapterRouteContext): void {
        context.registerRoute(async (req, res, url) => {
            if (
                url.pathname !== "/api/v1/auth/line/init" ||
                req.method !== "GET"
            ) {
                return false;
            }
            if (!this.channelId) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "not_configured",
                            message: "LINE adapter is not configured",
                        },
                    }),
                );
                return true;
            }
            const forwardedProto = String(
                req.headers?.["x-forwarded-proto"] ?? "",
            ).trim();
            const requestProtocol = forwardedProto.split(",")[0]?.trim();
            const protocol =
                requestProtocol ||
                (req.socket && "encrypted" in req.socket && req.socket.encrypted
                    ? "https"
                    : "http");
            const forwardedHost = String(
                req.headers?.["x-forwarded-host"] ?? "",
            )
                .trim()
                .split(",")[0]
                ?.trim();
            const host =
                forwardedHost || String(req.headers?.host ?? "").trim() || "";
            const callbackUrl = host
                ? new URL(
                      this.managedRedirectPath,
                      `${protocol}://${host}`,
                  ).toString()
                : this.managedRedirectPath;
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        channelId: this.channelId,
                        managedRedirectPath: this.managedRedirectPath,
                        callbackUrl,
                        usePkce: this.usePkce,
                        authorizationEndpoint:
                            "https://access.line.me/oauth2/v2.1/authorize",
                        scope: "profile openid email",
                    },
                }),
            );
            return true;
        });

        context.registerRoute(async (req, res, url) => {
            if (url.pathname !== this.managedRedirectPath) {
                return false;
            }
            if (req.method !== "GET" && req.method !== "HEAD") {
                res.writeHead(405, {
                    allow: "GET, HEAD",
                });
                res.end("");
                return true;
            }
            if (url.searchParams.has("code")) {
                const callbackPage = this.buildCallbackPage();
                res.writeHead(200, {
                    "content-type": "text/html; charset=utf-8",
                });
                res.end(callbackPage);
            } else {
                res.writeHead(204);
                res.end("");
            }
            return true;
        });
    }

    private buildCallbackPage(): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Signing in with LINE\u2026</title>
<style>
body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:sans-serif;background:#f5f5f5;color:#444;}
p{font-size:1.1rem;}
</style>
</head>
<body>
<p id="status">Completing LINE sign-in\u2026</p>
<script>
(async function() {
  var params = new URLSearchParams(location.search);
  var authorizationCode = params.get('code');
  var returnedState = params.get('state');
  var oauthError = params.get('error');

  if (oauthError || !authorizationCode) {
    sessionStorage.removeItem('line_oauth_state');
    sessionStorage.removeItem('line_code_verifier');
    location.href = '/login?reason=line_cancelled';
    return;
  }

  var expectedState = sessionStorage.getItem('line_oauth_state');
  if (!expectedState || expectedState !== returnedState) {
    sessionStorage.removeItem('line_oauth_state');
    sessionStorage.removeItem('line_code_verifier');
    location.href = '/login?reason=line_error';
    return;
  }
  sessionStorage.removeItem('line_oauth_state');

  var codeVerifier = sessionStorage.getItem('line_code_verifier') || '';
  sessionStorage.removeItem('line_code_verifier');

  var redirectUri = location.origin + '${this.managedRedirectPath}';

  var response;
  try {
    response = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        provider: 'line',
        authorizationCode: authorizationCode,
        codeVerifier: codeVerifier,
        redirectUri: redirectUri,
      }),
    });
  } catch (networkError) {
    location.href = '/login?reason=line_error';
    return;
  }

  var responseBody;
  try { responseBody = await response.json(); } catch { responseBody = null; }

  if (response.ok && responseBody && responseBody.data) {
    var sessionData = responseBody.data;
    localStorage.setItem('cognis_access_token', sessionData.token);
    localStorage.setItem('cognis_account', sessionData.accountId);
    localStorage.setItem('cognis_display_name', sessionData.displayName || sessionData.accountId);
    localStorage.setItem('cognis_role', sessionData.role || 'user');
    localStorage.setItem('cognis_is_founder', sessionData.isFounder ? 'true' : 'false');
    localStorage.setItem('cognis_login_time', new Date().toISOString());
    localStorage.setItem('cognis_user_validation_mode', sessionData.userValidationMode || 'none');
    location.href = '/dashboard';
    return;
  }

  var errorCode = (responseBody && responseBody.error && responseBody.error.code) || '';
  var reasonByErrorCode = {
    registration_pending_approval: 'line_pending_approval',
    registration_request_rejected: 'line_rejected',
  };
  var redirectReason = reasonByErrorCode[errorCode] || 'line_error';
  location.href = '/login?reason=' + redirectReason;
})();
<\/script>
</body>
</html>`;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new LineAuthAdapter();
}
