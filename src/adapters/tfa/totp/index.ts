import { createHmac, randomBytes } from "node:crypto";
import { toString } from "qrcode";
import type { TfaMethodAdapter } from "../../../gateways/tfa/gateway.js";

// RFC 6238 default token length; broadly supported by authenticator apps.
const TOTP_DIGITS: number = 6;
// RFC 6238 default step window used by common authenticator clients.
const TOTP_PERIOD_SECONDS: number = 30;
const TOTP_ALGORITHMS = ["SHA1", "SHA256", "SHA512"] as const;
type TotpAlgorithm = (typeof TOTP_ALGORITHMS)[number];

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

function parseAlgorithm(value: string): TotpAlgorithm {
    const normalized = String(value ?? "")
        .trim()
        .toUpperCase();
    return (TOTP_ALGORITHMS as ReadonlyArray<string>).includes(normalized)
        ? (normalized as TotpAlgorithm)
        : "SHA256";
}

function generateTotp(
    secret: string,
    algorithm: TotpAlgorithm,
    now = Date.now(),
): string {
    const counter = Math.floor(now / 1000 / TOTP_PERIOD_SECONDS);
    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
    counterBuffer.writeUInt32BE(counter % 2 ** 32, 4);
    const hmac = createHmac(algorithm.toLowerCase(), base32Decode(secret))
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

function verifyTotp(
    secret: string,
    algorithm: TotpAlgorithm,
    code: string,
    now = Date.now(),
): boolean {
    const normalizedCode = String(code ?? "").trim();
    if (!/^\d{6}$/.test(normalizedCode)) return false;
    const windows = [-1, 0, 1];
    return windows.some((windowOffset) => {
        const comparedTime = now + windowOffset * TOTP_PERIOD_SECONDS * 1000;
        return generateTotp(secret, algorithm, comparedTime) === normalizedCode;
    });
}

function toOtpAuthUri(input: {
    issuer: string;
    accountId: string;
    secret: string;
    algorithm: TotpAlgorithm;
}): string {
    const label = encodeURIComponent(`${input.issuer}:${input.accountId}`);
    const issuer = encodeURIComponent(input.issuer);
    const secret = encodeURIComponent(input.secret);
    return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=${encodeURIComponent(input.algorithm)}&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD_SECONDS}`;
}

class TotpAdapter implements TfaMethodAdapter {
    readonly id = "totp";
    readonly name = "Authenticator App";
    readonly defaultEnabled = true;

    private algorithm: TotpAlgorithm = "SHA256";

    private async buildSetupDetails(input: {
        accountId: string;
        issuer: string;
        secret: string;
    }): Promise<Record<string, string>> {
        const otpAuthUri = toOtpAuthUri({
            issuer: input.issuer,
            accountId: input.accountId,
            secret: input.secret,
            algorithm: this.algorithm,
        });
        const qrSvg = await toString(otpAuthUri, {
            type: "svg",
            errorCorrectionLevel: "M",
            margin: 1,
            width: 220,
        });
        return {
            manualSecret: input.secret,
            qrSvg,
        };
    }

    async beginSetup(input: {
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
        const details = await this.buildSetupDetails({
            accountId: input.accountId,
            issuer: input.issuer,
            secret,
        });
        return {
            pendingPayload: {
                secret,
            },
            view: {
                prompt: "adapter.tfa.totp.setup_prompt",
                fields: [
                    {
                        key: "code",
                        label: "ui.app.login.tfa.code_label",
                        type: "text",
                        inputMode: "numeric",
                        maxLength: 6,
                    },
                ],
                details,
            },
        };
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
        const verified = verifyTotp(secret, this.algorithm, code);
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
                algorithm: this.algorithm,
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
        const algorithm = parseAlgorithm(
            String(input.state.algorithm ?? "SHA256"),
        );
        const verified = verifyTotp(secret, algorithm, code);
        if (!verified) {
            return Promise.resolve({
                verified: false,
                message: "invalid_totp_code",
            });
        }
        return Promise.resolve({ verified: true });
    }

    async renderMethodDetails(input: {
        accountId: string;
        state: Record<string, unknown>;
        issuer: string;
    }): Promise<{ details: Record<string, string> } | null> {
        const secret = String(input.state.secret ?? "").trim();
        if (!secret) {
            return null;
        }
        const details = await this.buildSetupDetails({
            accountId: input.accountId,
            issuer: input.issuer,
            secret,
        });
        return { details };
    }

    getConfigSchema() {
        return [
            {
                key: "algorithm",
                label: "HMAC Algorithm",
                type: "select" as const,
                required: false,
                options: [...TOTP_ALGORITHMS],
            },
        ];
    }

    configure(config: Record<string, unknown>): void {
        this.algorithm = parseAlgorithm(String(config.algorithm ?? ""));
    }
}

export function createAdapter(): TfaMethodAdapter {
    return new TotpAdapter();
}
