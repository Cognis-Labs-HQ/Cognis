import { randomUUID } from "node:crypto";
import {
    createCtx,
    type SecretEncryption,
    type SealedSecret,
} from "../../../../index.js";

type Entry = { scope: string; value: string };

/** Public cipher contract fake; API tests separately exercise the production AES implementation. */
export function createSecretContext(records = new Map<string, Entry>()) {
    const ctx = createCtx();
    const encryption: SecretEncryption = {
        async seal(scope: string, value: string): Promise<SealedSecret> {
            const ciphertext = randomUUID();
            records.set(ciphertext, { scope, value });
            return { iv: randomUUID(), ciphertext };
        },
        async open(scope: string, sealed: SealedSecret): Promise<string> {
            const entry = records.get(sealed.ciphertext);
            if (!entry || entry.scope !== scope)
                throw new Error("credential_authentication_failed");
            return entry.value;
        },
    };
    ctx.contributeCapability("secrets:encryption", encryption);
    return { ctx, records };
}
