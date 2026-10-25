import { randomInt, randomUUID } from "node:crypto";

/** Provider-free public name; immutable account IDs remain private identifiers. */
export function usernameBase(value: string): string {
    const base = value
        .split(":")
        .at(-1)
        ?.trim()
        .toLowerCase()
        .replace(/^@/, "");
    if (!base) throw new Error("username_required");
    return base;
}

export function usernameWithSuffix(base: string): string {
    return `${base.slice(0, 20)}-${randomInt(36 ** 4)
        .toString(36)
        .padStart(4, "0")}`;
}

export const createAccountId = (): string =>
    `u_${randomUUID().replaceAll("-", "")}`;
export const isPrivateAccountId = (value: string): boolean =>
    /^u_[a-f0-9]{32}$/.test(value);
