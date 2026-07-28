import { randomUUID } from "node:crypto";

const MAX_HEADER_LINE_LENGTH = 78;

export function sanitizeHeader(value: string): string {
    return value
        .replace(/[\r\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

export function sanitizeSmtpPath(value: string): string {
    return extractEmailAddress(value)
        .replace(/[\r\n<>]/g, "")
        .trim();
}

function extractEmailAddress(value: string): string {
    const sanitized = sanitizeHeader(value);
    const openingBracketIndex = sanitized.indexOf("<");
    if (openingBracketIndex === -1) return sanitized;
    const closingBracketIndex = sanitized.indexOf(">", openingBracketIndex + 1);
    if (closingBracketIndex === -1) return sanitized;
    const bracketed = sanitized
        .slice(openingBracketIndex + 1, closingBracketIndex)
        .trim();
    if (!bracketed || /\s/.test(bracketed) || !bracketed.includes("@")) {
        return sanitized;
    }
    return bracketed;
}

function getAddressDomain(value: string): string | null {
    const address = extractEmailAddress(value);
    const atIndex = address.lastIndexOf("@");
    if (atIndex === -1) return null;
    const domain = address.slice(atIndex + 1).toLowerCase();
    if (/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(domain)) return domain;
    return null;
}

function sanitizeMessageIdDomain(value: string | undefined): string | null {
    if (!value) return null;
    const candidate = sanitizeHeader(value)
        .replace(/^https?:\/\//i, "")
        .split("/")[0]
        .split(":")[0]
        .toLowerCase();
    if (/^[a-z0-9.-]+\.[a-z0-9-]+$/.test(candidate)) return candidate;
    return null;
}

export function makeMessageId(from: string, domainHint?: string): string {
    const domain =
        getAddressDomain(from) ??
        sanitizeMessageIdDomain(domainHint) ??
        "localhost.localdomain";
    return `<${Date.now()}.${randomUUID()}@${domain}>`;
}

function encodeHeaderPhrase(value: string): string {
    const sanitized = sanitizeHeader(value);
    if (/^[\x20-\x7e]*$/.test(sanitized)) return sanitized;
    return `=?UTF-8?B?${Buffer.from(sanitized, "utf8").toString("base64")}?=`;
}

export function foldHeader(name: string, value: string): string {
    const prefix = `${name}: `;
    const maxFirst = MAX_HEADER_LINE_LENGTH - prefix.length;
    if (value.length <= maxFirst) return `${prefix}${value}`;

    const words = value.split(" ");
    const lines: string[] = [];
    let current = prefix;
    for (const word of words) {
        const separator =
            current.endsWith(" ") || current === prefix ? "" : " ";
        const limit =
            lines.length === 0
                ? MAX_HEADER_LINE_LENGTH
                : MAX_HEADER_LINE_LENGTH - 1;
        if (
            `${current}${separator}${word}`.length > limit &&
            current.trim() !== `${name}:`
        ) {
            lines.push(current);
            current = ` ${word}`;
        } else {
            current += `${separator}${word}`;
        }
    }
    lines.push(current);
    return lines.join("\r\n");
}

function encodeAddressDisplayName(value: string): string {
    const encoded = encodeHeaderPhrase(value);
    if (encoded.startsWith("=?")) return encoded;
    if (/^[A-Za-z0-9 !#$%&'*+\-/=?^_`{|}~]+$/.test(encoded)) return encoded;
    return `"${encoded.replace(/(["\\])/g, "\\$1")}"`;
}

export function formatAddressHeader(
    address: string,
    displayName?: string,
): string {
    const email = extractEmailAddress(address);
    const safeDisplayName = displayName ? sanitizeHeader(displayName) : "";
    if (!safeDisplayName) return sanitizeHeader(address);
    return `${encodeAddressDisplayName(safeDisplayName)} <${email}>`;
}
