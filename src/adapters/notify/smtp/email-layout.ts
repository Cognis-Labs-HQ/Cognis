import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
    encodeBasicHtmlEntities,
    decodeBasicHtmlEntities,
} from "./html-entities.js";
import {
    safeEmailUrl,
    validateEmailPresentation,
    type EmailBlock,
    type EmailPresentation,
} from "./email-templates.js";

let cachedEmailTemplate: string | null = null;
async function loadEmailTemplate(): Promise<string> {
    if (cachedEmailTemplate !== null) return cachedEmailTemplate;
    const templatePath = fileURLToPath(
        new URL("./templates/notification.html", import.meta.url),
    );
    cachedEmailTemplate = await readFile(templatePath, "utf8");
    return cachedEmailTemplate;
}
interface ThemePalette {
    bgOuter: string;
    bgHeader: string;
    bgContent: string;
    bgCard: string;
    bgFooter: string;
    colorAccent: string;
    colorAccent2: string;
    colorText: string;
    colorBodyText: string;
    colorMuted: string;
    colorFooterText: string;
    colorDivider: string;
    colorDiamond: string;
    shadowColor: string;
}
const DARK_PALETTE: ThemePalette = {
    bgOuter: "#0a1628",
    bgHeader: "linear-gradient(135deg,#071421 0%,#0f2d3a 60%,#112b25 100%)",
    bgContent: "#0d1f35",
    bgCard: "rgba(255,255,255,0.04)",
    bgFooter: "#081529",
    colorAccent: "#2a7f62",
    colorAccent2: "#3aa783",
    colorText: "#e2e8f0",
    colorBodyText: "#c8d8e8",
    colorMuted: "#4a8fa8",
    colorFooterText: "#94a9be",
    colorDivider: "rgba(42,127,98,0.25)",
    colorDiamond: "#2a5068",
    shadowColor: "rgba(0,0,0,0.45)",
};
const LIGHT_PALETTE: ThemePalette = {
    bgOuter: "#e8eef9",
    bgHeader: "linear-gradient(135deg,#f0f7ff 0%,#e8f3ff 60%,#e8f5f0 100%)",
    bgContent: "#ffffff",
    bgCard: "rgba(248,250,255,0.96)",
    bgFooter: "#f4f8ff",
    colorAccent: "#0f766e",
    colorAccent2: "#0f766e",
    colorText: "#0f172a",
    colorBodyText: "#1e293b",
    colorMuted: "#475569",
    colorFooterText: "#5b6b82",
    colorDivider: "rgba(15,118,110,0.25)",
    colorDiamond: "#94a3b8",
    shadowColor: "rgba(15,23,42,0.15)",
};

let copyPromise: Promise<Map<string, string>> | undefined;
async function emailCopy(key: string): Promise<string> {
    copyPromise ??= readFile(
        new URL("./languages/en/strings.xml", import.meta.url),
        "utf8",
    )
        .then(
            (xml) =>
                new Map(
                    [
                        ...xml.matchAll(
                            /<string name="([^"]+)">([\s\S]*?)<\/string>/g,
                        ),
                    ].map((match) => [
                        match[1],
                        decodeBasicHtmlEntities(match[2]).trim(),
                    ]),
                ),
        )
        .catch((error) => {
            copyPromise = undefined;
            throw error;
        });
    const copy = (await copyPromise).get(key);
    if (!copy) throw new Error(`missing_translation:${key}`);
    return copy;
}

function linkText(text: string, accent: string): string {
    const escaped = encodeBasicHtmlEntities;
    let html = "",
        cursor = 0;
    for (const match of text.matchAll(/https?:\/\/[^\s<]+/g)) {
        const index = match.index ?? 0;
        html += escaped(text.slice(cursor, index));
        const url = safeEmailUrl(match[0]);
        html += `<a href="${escaped(url)}" style="color:${accent};text-decoration:underline;">${escaped(match[0])}</a>`;
        cursor = index + match[0].length;
    }
    return (html + escaped(text.slice(cursor))).replace(/\n/g, "<br>");
}

function renderBlock(
    block: EmailBlock,
    palette: ThemePalette,
): { html: string; text: string } {
    const escape = encodeBasicHtmlEntities;
    if (block.type === "paragraph")
        return {
            html: `<p style="margin:0 0 16px;color:${palette.colorBodyText};">${linkText(block.text, palette.colorAccent2)}</p>`,
            text: block.text,
        };
    if (block.type === "heading")
        return {
            html: `<h2 style="font-size:18px;margin:16px 0;color:${palette.colorText};">${escape(block.text)}</h2>`,
            text: block.text,
        };
    if (block.type === "code")
        return {
            html: `<p style="padding:16px;background:${palette.bgCard};border:1px solid ${palette.colorDivider};color:${palette.colorText};font:700 24px monospace;letter-spacing:4px;white-space:pre-wrap;">${escape(block.text)}</p>`,
            text: block.text,
        };
    if (block.type === "list")
        return {
            html: `<ul style="color:${palette.colorBodyText};">${block.items.map((item) => `<li style="color:${palette.colorBodyText};">${linkText(item, palette.colorAccent2)}</li>`).join("")}</ul>`,
            text: block.items.map((item) => `- ${item}`).join("\n"),
        };
    if (block.type === "table")
        return {
            html: `<table style="width:100%;border-collapse:collapse;color:${palette.colorBodyText};"><thead><tr>${block.headings.map((text) => `<th scope="col" style="text-align:left;padding:8px;color:${palette.colorText};border-bottom:1px solid ${palette.colorDivider};">${escape(text)}</th>`).join("")}</tr></thead><tbody>${block.rows.map((row) => `<tr>${row.map((text) => `<td style="padding:8px;color:${palette.colorBodyText};border-bottom:1px solid ${palette.colorDivider};">${escape(text)}</td>`).join("")}</tr>`).join("")}</tbody></table>`,
            text: [block.headings, ...block.rows]
                .map((row) => row.join("\t"))
                .join("\n"),
        };
    if (block.type === "action")
        return {
            html: `<p style="margin:20px 0;"><a href="${escape(safeEmailUrl(block.url))}" style="display:inline-block;padding:13px 24px;background:${palette.colorAccent};color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;">${escape(block.label)}</a></p>`,
            text: `${block.label}: ${safeEmailUrl(block.url)}`,
        };
    return {
        html: `<hr style="border:0;border-top:1px solid ${palette.colorDivider};">`,
        text: "--",
    };
}

export async function renderEmailLayout(
    subject: string,
    body: string,
    options: {
        theme?: string;
        presentation?: EmailPresentation;
        externalHost?: string;
        verifyUrl?: string;
        verifyButtonLabel?: string;
    },
) {
    const palette = options.theme === "dark" ? DARK_PALETTE : LIGHT_PALETTE;
    const presentation = validateEmailPresentation(options.presentation ?? {});
    const brand = presentation.brandName ?? "Cognis";
    const brandUrl = presentation.brandUrl || options.externalHost;
    const externalHost = brandUrl ? safeEmailUrl(brandUrl) : "";
    const iconUrl =
        presentation.logoUrl ||
        (externalHost
            ? new URL(
                  "assets/icons/cognis-icon.png",
                  externalHost.replace(/\/?$/, "/"),
              ).href
            : "");
    const content: EmailBlock[] = presentation.blocks ?? [
        { type: "paragraph", text: body },
    ];
    const rendered = content.map((block) => renderBlock(block, palette));
    if (options.verifyUrl)
        rendered.push(
            renderBlock(
                {
                    type: "action",
                    url: options.verifyUrl,
                    label:
                        options.verifyButtonLabel ??
                        (await emailCopy("adapter.smtp.email.action")),
                },
                palette,
            ),
        );
    const footer =
        presentation.footerText ??
        (await emailCopy("adapter.smtp.email.footer"));
    const escape = encodeBasicHtmlEntities;
    const values: Record<string, string> = {
        ...palette,
        subject: escape(subject),
        body: rendered.map((block) => block.html).join(""),
        brandName: escape(brand),
        footerText: escape(footer),
        previewText: escape(presentation.previewText ?? ""),
        brandIcon: iconUrl
            ? `<td style="vertical-align:middle;padding-right:12px;"><img src="${escape(safeEmailUrl(iconUrl))}" alt="${escape(brand)}" width="36" height="36" style="display:block;border-radius:6px;"></td>`
            : "",
        footerBrandLink: externalHost
            ? `<a href="${escape(externalHost)}" style="color:${palette.colorAccent2};text-decoration:none;">${escape(brand)}</a>`
            : escape(brand),
        externalHost: escape(externalHost),
    };
    const htmlBody = (await loadEmailTemplate()).replace(
        /\{\{([a-zA-Z0-9]+)\}\}/g,
        (_match, key: string) => {
            if (!Object.hasOwn(values, key))
                throw new Error("email_layout_placeholder_missing");
            return values[key];
        },
    );
    return {
        htmlBody,
        textBody: [
            subject,
            "",
            ...rendered.map((block) => block.text),
            "",
            "--",
            footer,
            brand,
        ].join("\n"),
    };
}
