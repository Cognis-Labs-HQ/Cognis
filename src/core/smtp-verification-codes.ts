import { randomInt } from "node:crypto";

export const DEFAULT_SMTP_VERIFICATION_CODE_LENGTH = 6;
export const MIN_SMTP_VERIFICATION_CODE_LENGTH = 4;
export const MAX_SMTP_VERIFICATION_CODE_LENGTH = 10;

const NUMERIC_DIGITS = "0123456789";

export function clampSmtpVerificationCodeLength(input: unknown): number {
    if (typeof input !== "number" && typeof input !== "string") {
        return DEFAULT_SMTP_VERIFICATION_CODE_LENGTH;
    }
    const parsed = Number.parseInt(String(input), 10);
    if (!Number.isFinite(parsed)) {
        return DEFAULT_SMTP_VERIFICATION_CODE_LENGTH;
    }
    return Math.max(
        MIN_SMTP_VERIFICATION_CODE_LENGTH,
        Math.min(MAX_SMTP_VERIFICATION_CODE_LENGTH, parsed),
    );
}

export function generateSmtpNumericCode(codeLength: number): string {
    return Array.from(
        { length: clampSmtpVerificationCodeLength(codeLength) },
        () => NUMERIC_DIGITS[randomInt(0, NUMERIC_DIGITS.length)],
    ).join("");
}
