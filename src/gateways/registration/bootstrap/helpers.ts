import path from "node:path";

export const PUBLIC_ROOT = path.resolve(process.cwd(), "src", "ui", "public");

export function inviteBaseUrl(): string {
    if (process.env.EXTERNAL_HOST) return process.env.EXTERNAL_HOST;
    if (process.env.HOST) return `http://${process.env.HOST}`;
    return "http://localhost:3000";
}

export function issueInviteErrorStatus(code: string): number {
    if (code === "invite_disabled") return 404;
    if (code === "smtp_unavailable") return 503;
    if (code === "founder_token_limit_reached") return 429;
    if (code === "invitee_email_required") return 400;
    if (code === "email_taken") return 409;
    if (code === "email_domain_not_allowed") return 422;
    return 500;
}

export function redeemInviteErrorStatus(code: string): number {
    if (code === "invite_disabled") return 404;
    if (code === "invalid_token") return 400;
    if (
        code === "username_taken" ||
        code === "username_and_password_required"
    ) {
        return 400;
    }
    if (code === "inviter_not_found") return 409;
    return 500;
}
