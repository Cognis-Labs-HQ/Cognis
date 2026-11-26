import { createHmac } from "node:crypto";

function encodeJwtPart(value) {
    return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function signJwtHs256(payload, secret, header = {}) {
    const normalizedSecret = String(secret ?? "");
    if (!normalizedSecret) throw new Error("JWT secret is required.");
    const encodedHeader = encodeJwtPart({
        alg: "HS256",
        typ: "JWT",
        ...header,
    });
    const encodedPayload = encodeJwtPart(payload);
    const signature = createHmac("sha256", normalizedSecret)
        .update(`${encodedHeader}.${encodedPayload}`)
        .digest("base64url");
    return `${encodedHeader}.${encodedPayload}.${signature}`;
}
