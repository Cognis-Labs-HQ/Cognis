import { AsyncLocalStorage } from "node:async_hooks";
import type { ModuleMarketplaceLog } from "./index.js";

/** Redact credentials only for the lifetime of their owning asynchronous operation. */
export class CredentialContext {
    private readonly values = new AsyncLocalStorage<string[]>();

    private redact(value: string): string {
        for (const secret of this.values.getStore() ?? [])
            value = value.split(secret).join("[redacted]");
        return value;
    }

    private metadata(value: unknown): unknown {
        if (typeof value === "string") return this.redact(value);
        if (Array.isArray(value))
            return value.map((entry) => this.metadata(entry));
        if (value && typeof value === "object")
            return Object.fromEntries(
                Object.entries(value).map(([key, entry]) => [
                    this.redact(key),
                    this.metadata(entry),
                ]),
            );
        return value;
    }

    logger(log: ModuleMarketplaceLog): ModuleMarketplaceLog {
        return (level, message, metadata) =>
            log(
                level,
                this.redact(message),
                this.metadata(metadata) as Record<string, unknown>,
            );
    }

    async run<Result>(
        token: string | undefined,
        operation: () => Promise<Result>,
    ): Promise<Result> {
        const secrets = token
            ? [
                  ...new Set([
                      token,
                      encodeURIComponent(token),
                      Buffer.from(`oauth2:${token}`).toString("base64"),
                  ]),
              ]
            : [];
        return this.values.run(secrets, async () => {
            try {
                return await operation();
            } catch (error) {
                if (!token || !(error instanceof Error)) throw error;
                const safe = new Error(this.redact(error.message));
                safe.name = error.name;
                const code = (error as { code?: unknown }).code;
                if (typeof code === "string")
                    Object.assign(safe, { code: this.redact(code) });
                throw safe;
            }
        });
    }
}
