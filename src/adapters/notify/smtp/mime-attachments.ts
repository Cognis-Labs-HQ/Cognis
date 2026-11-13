import { sanitizeFilenameBase } from "../../../api/reuse/sanitize-filename.js";

const MAX_ATTACHMENT_FILENAME_LENGTH = 128;

export interface MimeAttachment {
    filename: string;
    contentType?: string;
    content: string;
}

export function buildAttachmentMimeParts(
    attachments: MimeAttachment[],
    mixedBoundary: string,
): string {
    return attachments
        .map((attachment) => {
            const safeFilename = sanitizeFilenameBase(
                attachment.filename,
                "file",
            ).slice(0, MAX_ATTACHMENT_FILENAME_LENGTH);
            const contentType =
                typeof attachment.contentType === "string" &&
                attachment.contentType.trim().length > 0
                    ? attachment.contentType.trim()
                    : "application/octet-stream";
            const encodedContent = Buffer.from(
                String(attachment.content ?? ""),
                "utf8",
            ).toString("base64");
            return [
                `--${mixedBoundary}`,
                `Content-Type: ${contentType}; name=\"${safeFilename}\"`,
                "Content-Transfer-Encoding: base64",
                `Content-Disposition: attachment; filename=\"${safeFilename}\"`,
                "",
                encodedContent,
            ].join("\r\n");
        })
        .join("\r\n");
}
