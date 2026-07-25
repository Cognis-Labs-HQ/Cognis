import type { LocalAccountStore } from "../../../gateways/auth/reuse/account-store.js";
import type { RegistrationGatewayAdapter } from "../../../gateways/registration/gateway.js";

export function createAdapter(deps: {
    accountStore: LocalAccountStore;
    createProfile?: (
        accountId: string,
        handle: string,
        role?: string,
        displayName?: string,
    ) => Promise<void>;
}): RegistrationGatewayAdapter {
    const { accountStore, createProfile } = deps;

    return {
        id: "public",
        name: "Public Registration",
        defaultEnabled: false,
        public: {
            async register(input: {
                username: string;
                password: string;
                email?: string;
                displayName?: string;
            }): Promise<{
                username: string;
                role?: string;
                enabled: boolean;
            }> {
                const username = String(input.username ?? "").trim();
                const password = String(input.password ?? "");
                if (!username || !password) {
                    throw new Error("username_and_password_required");
                }
                const displayName = input.displayName?.trim() || undefined;
                const created = await accountStore.register(
                    username,
                    password,
                    "user",
                    displayName,
                );
                await createProfile?.(username, username, "user", displayName);
                return created;
            },
        },
    };
}
