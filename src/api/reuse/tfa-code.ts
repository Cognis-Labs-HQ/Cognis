import { randomInt } from "node:crypto";

/**
 * Time-limited verification code utility.
 *
 * Generates random numeric codes and stores them in memory with a
 * configurable expiry. Each code can only be used once — it is consumed
 * (deleted) on successful verification.
 */

export interface TfaStore {
    set(key: string, code: string, expiresAt: number): void;
    get(key: string): { code: string; expiresAt: number } | undefined;
    delete(key: string): void;
}

export class InMemoryTfaStore implements TfaStore {
    private readonly entries = new Map<
        string,
        { code: string; expiresAt: number }
    >();

    set(key: string, code: string, expiresAt: number): void {
        this.entries.set(key, { code, expiresAt });
    }

    get(key: string): { code: string; expiresAt: number } | undefined {
        return this.entries.get(key);
    }

    delete(key: string): void {
        this.entries.delete(key);
    }
}

const DEFAULT_CODE_DIGITS = 6;

export function generateNumericCode(digits = DEFAULT_CODE_DIGITS): string {
    const max = Math.pow(10, digits);
    const value = randomInt(0, max);
    return String(value).padStart(digits, "0");
}

export class TfaCodeService {
    constructor(
        private readonly store: TfaStore,
        private readonly now: () => number = () => Date.now(),
    ) {}

    /**
     * Generates and stores a new code for `key`.
     * Any previous code for the same key is replaced.
     *
     * @param key      Unique key (e.g. "username:email")
     * @param expiryMs Milliseconds until the code expires (default: 15 minutes)
     * @returns The generated code string
     */
    issue(key: string, expiryMs = 15 * 60 * 1000): string {
        const code = generateNumericCode();
        this.store.set(key, code, this.now() + expiryMs);
        return code;
    }

    /**
     * Returns the existing pending code for `key` if one is still live,
     * otherwise generates and stores a new one. Use this instead of `issue`
     * when a re-send may be rate-limited: an already-delivered code is
     * preserved so that verifying it still succeeds even if the re-send fails.
     *
     * @param key      Unique key (e.g. "username:email")
     * @param expiryMs Milliseconds until a newly-issued code expires (default: 15 minutes)
     * @returns The code string (existing or newly generated)
     */
    issueOrGet(key: string, expiryMs = 15 * 60 * 1000): string {
        const existing = this.store.get(key);
        if (existing && this.now() <= existing.expiresAt) {
            return existing.code;
        }
        return this.issue(key, expiryMs);
    }

    /**
     * Verifies a code for `key`. Returns true and consumes the code on success.
     * Returns false if the code is wrong, expired, or has already been used.
     */
    verify(key: string, code: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        if (this.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        if (entry.code !== code) return false;
        this.store.delete(key);
        return true;
    }

    /** Returns true if there is a live (unexpired) pending code for `key`. */
    hasPending(key: string): boolean {
        const entry = this.store.get(key);
        if (!entry) return false;
        if (this.now() > entry.expiresAt) {
            this.store.delete(key);
            return false;
        }
        return true;
    }
}
