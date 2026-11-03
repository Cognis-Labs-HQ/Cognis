import type { Ctx, SecretEncryption } from "@cognis/core";
import {
    decryptPayload,
    deriveScopedKey,
    encryptPayload,
    getDataEncryptionKey,
} from "../reuse/crypto.js";

/** Contribute the private server cipher with a configured, persistent instance key. */
export function registerSecretEncryption(ctx: Ctx): void {
    const scopedKey = async (scope: string): Promise<CryptoKey> => {
        const secret = getDataEncryptionKey();
        if (!secret.trim())
            throw new Error("server_secret_encryption_unavailable");
        return deriveScopedKey(`sealedSecrets:${scope}`, secret);
    };
    const encryption: SecretEncryption = {
        seal: async (scope, value) =>
            encryptPayload(await scopedKey(scope), value),
        open: async (scope, value) =>
            decryptPayload(await scopedKey(scope), value.iv, value.ciphertext),
    };
    ctx.contributeCapability("secrets:encryption", encryption);
}
