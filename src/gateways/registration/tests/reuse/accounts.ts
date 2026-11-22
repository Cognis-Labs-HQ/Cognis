import type { LocalAccountStore } from "../../../auth/reuse/account-store.js";

function unexpectedAccountOperation(): never {
    throw new Error("Unexpected registration account operation");
}

export function createAccountStore(): LocalAccountStore {
    return {
        getUsername: unexpectedAccountOperation,
        register: async (username, _password, role = "user") => ({
            username,
            role,
            enabled: true,
        }),
        verify: unexpectedAccountOperation,
        has: unexpectedAccountOperation,
        list: unexpectedAccountOperation,
        setRole: unexpectedAccountOperation,
        setPassword: unexpectedAccountOperation,
        setEnabled: unexpectedAccountOperation,
        delete: unexpectedAccountOperation,
        getInfo: unexpectedAccountOperation,
        updateLastLogin: unexpectedAccountOperation,
        setFounder: unexpectedAccountOperation,
        isFounder: async () => false,
        exists: async () => true,
        getDisplayName: async (username) => username,
    };
}
