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
        const isAdmin = values.includes(this.adminValue);
        return {
            accountId: parsed.nameId,
            provider: "saml",
            externalUserId: parsed.nameId,
            email: parsed.email,
            isAdmin,
        };
    }

    getConfigSchema(): AuthConfigField[] {
        return [
            {
                key: "entryPoint",
                label: "Entry Point URL",
                type: "text",
                required: true,
            },
            { key: "issuer", label: "Issuer", type: "text", required: true },
            {
                key: "certificate",
                label: "Certificate",
                type: "text",
                required: true,
            },
            {
                key: "adminAttribute",
                label: "Admin Attribute",
                type: "text",
                required: false,
            },
            {
                key: "adminValue",
                label: "Admin Attribute Value",
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

    setClient(client: SamlClient): void {
        this.client = client;
    }
}

export function createAdapter(): AuthProviderAdapter {
    return new SamlAuthAdapter();
}
