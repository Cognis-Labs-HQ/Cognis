import type { AuthContext } from "@cognis/core";
import type {
    AuthProviderAdapter,
    AuthConfigField,
} from "../../../gateways/auth/gateway.js";

export interface SamlAssertion {
    nameId: string;
    email?: string;
    attributes?: Record<string, string | string[]>;
}

export interface SamlClient {
    consumeAssertion(encodedAssertion: string): Promise<SamlAssertion | null>;
}

class SamlAuthAdapter implements AuthProviderAdapter {
    readonly id = "saml";
    readonly stringsBaseUrl = "/static/adapters/auth/saml/languages";
    readonly name = "SAML";

    private client: SamlClient | null = null;
    private adminAttribute = "groups";
    private adminValue = "cognis-admins";

    async authenticate(
        credentials: Record<string, unknown>,
    ): Promise<AuthContext | null> {
        const assertion = String(credentials.assertion ?? "");
        if (!this.client || !assertion) return null;
        const parsed = await this.client.consumeAssertion(assertion);
        if (!parsed) return null;
        const rawAttribute = parsed.attributes?.[this.adminAttribute];
        const values = Array.isArray(rawAttribute)
            ? rawAttribute
            : rawAttribute
              ? [rawAttribute]
              : [];
        const hasAdminRole = values.includes(this.adminValue);
        return {
            accountId: parsed.nameId,
            provider: "saml",
            externalUserId: parsed.nameId,
            email: parsed.email,
            role: hasAdminRole ? "admin" : "user",
        };
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "entryPoint",
                label: "adapter.saml.config.entrypoint",
                type: "text",
                required: true,
            },
            {
                key: "issuer",
                label: "adapter.saml.config.issuer",
                type: "text",
                required: true,
            },
            {
                key: "certificate",
                label: "adapter.saml.config.certificate",
                type: "text",
                required: true,
            },
            {
                key: "adminAttribute",
                label: "adapter.saml.config.adminattribute",
                type: "text",
                required: false,
            },
            {
                key: "adminValue",
                label: "adapter.saml.config.adminvalue",
                type: "text",
                required: false,
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        if (typeof config.adminAttribute === "string") {
            this.adminAttribute = config.adminAttribute;
        }
        if (typeof config.adminValue === "string") {
            this.adminValue = config.adminValue;
        }
    }

    getPasswordResetSupport(): { supported: boolean; reason: string } {
        return {
            supported: false,
            reason: "Password reset is managed by your SAML identity provider.",
        };
    }

    setClient(client: SamlClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new SamlAuthAdapter();
}
