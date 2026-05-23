import { createHmac, randomBytes } from "node:crypto";
import type { TfaMethodAdapter } from "../../../gateways/tfa/gateway.js";

const TOTP_DIGITS = 6;
const TOTP_PERIOD_SECONDS = 30;

function base32Encode(input: Buffer): string {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    let output = "";

    for (const byte of input) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }

    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }

    return output;
}

function base32Decode(input: string): Buffer {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const clean = input.toUpperCase().replace(/=+$/g, "");
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];

    for (const char of clean) {
        const index = alphabet.indexOf(char);
        if (index < 0) continue;
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            bytes.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }

    return Buffer.from(bytes);
}

function generateTotp(secret: string, now = Date.now()): string {
    const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
    counterBuffer.writeUInt32BE(counter % 2 ** 32, 4);
    const hmac = createHmac("sha1", base32Decode(secret))
        .update(counterBuffer)
        .digest();
    const offset = hmac[hmac.length - 1] & 0x0f;
    const binaryCode =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);
    const token = binaryCode % 10 ** TOTP_DIGITS;
    return token.toString().padStart(TOTP_DIGITS, "0");
}

function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
    const normalizedCode = String(code ?? "").trim();
    if (!/^\d{6}$/.test(normalizedCode)) return false;
    const windows = [-1, 0, 1];
    return windows.some((windowOffset) => {
        const comparedTime = now + windowOffset * TOTP_PERIOD_SECONDS * 1000;
        return generateTotp(secret, comparedTime) === normalizedCode;
    });
}

function toOtpAuthUri(input: {
    issuer: string;
    accountId: string;
    secret: string;
}): string {
    const label = encodeURIComponent(`${input.issuer}:${input.accountId}`);
    const issuer = encodeURIComponent(input.issuer);
    const secret = encodeURIComponent(input.secret);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

class TotpAdapter implements TfaMethodAdapter {
    readonly id = "totp";
    readonly name = "Authenticator App (TOTP)";

    beginSetup(input: {
        accountId: string;
        displayName: string;
        issuer: string;
    }): Promise<{
        pendingPayload: Record<string, unknown>;
        view: {
            prompt: string;
            fields: Array<{
                key: string;
                label: string;
                type: "text" | "number" | "password";
                inputMode: "numeric" | "text";
                maxLength: number;
            }>;
            details: Record<string, string>;
        };
    }> {
        const secret = base32Encode(randomBytes(20));
        const otpAuthUri = toOtpAuthUri({
            issuer: input.issuer,
            accountId: input.accountId,
            secret,
        });
        return Promise.resolve({
            pendingPayload: {
                secret,
            },
            view: {
                prompt: "gateway.auth.security.tfa_totp_prompt",
                fields: [
                    {
                        key: "code",
                        label: "ui.app.login.tfa.code_label",
                        type: "text",
                        inputMode: "numeric",
                        maxLength: 6,
                    },
                ],
                details: {
                    otpAuthUri,
                    manualSecret: secret,
                },
            },
        });
    }

    verifySetup(input: {
        accountId: string;
        pendingPayload: Record<string, unknown>;
        verification: Record<string, unknown>;
    }): Promise<{
        verified: boolean;
        state?: Record<string, unknown>;
        message?: string;
    }> {
        const secret = String(input.pendingPayload.secret ?? "").trim();
        const code = String(input.verification.code ?? "").trim();
        if (!secret || !code) {
            return Promise.resolve({
                verified: false,
                message: "code_required",
            });
        }
        const verified = verifyTotp(secret, code);
        if (!verified) {
            return Promise.resolve({
                verified: false,
                message: "invalid_totp_code",
            });
        }
        return Promise.resolve({
            verified: true,
            state: {
                secret,
                algorithm: "SHA1",
                digits: TOTP_DIGITS,
                period: TOTP_PERIOD_SECONDS,
            },
        });
    }

    verifyLogin(input: {
        accountId: string;
        state: Record<string, unknown>;
        payload: Record<string, unknown>;
    }): Promise<{ verified: boolean; message?: string }> {
        const secret = String(input.state.secret ?? "").trim();
        const code = String(input.payload.code ?? "").trim();
        if (!secret || !code) {
            return Promise.resolve({
                verified: false,
                message: "code_required",
            });
        }
        const verified = verifyTotp(secret, code);
        if (!verified) {
            return Promise.resolve({
                verified: false,
                message: "invalid_totp_code",
            });
        }
        return Promise.resolve({ verified: true });
    }

    getConfigSchema() {
        return [];
    }

    configure(): void {
        // TOTP adapter has no configurable runtime fields.
    }
}

export function createAdapter(): TfaMethodAdapter {
    return new TotpAdapter();
}
