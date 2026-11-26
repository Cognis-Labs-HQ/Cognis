import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { sourceFiles } from "../component-files.js";

const emptyGuidance = [
    /^Available actions are shown on /m,
    /^Open \[the feature\]/m,
    /^The example uses the documented interface of /m,
    /^This component does not declare a standalone command-line entry point\./m,
    /^This topic is reference material and does not expose an independent endpoint\./m,
    /^This documentation topic has no runtime configuration of its own\./m,
    /^Reading documentation does not grant permission to execute its examples\./m,
    /^Das Beispiel verwendet die dokumentierte Schnittstelle von /m,
    /^Diese Komponente deklariert keinen eigenständigen Befehlszeileneinstieg\./m,
    /^Dieses Thema ist eine Referenz und stellt keinen eigenen Endpunkt bereit\./m,
    /^Dieses Dokumentationsthema hat keine eigene Laufzeitkonfiguration\./m,
    /^Contoh ini memakai antarmuka .+ yang didokumentasikan\./m,
    /^Komponen ini tidak menyatakan titik masuk baris perintah mandiri\./m,
    /^Topik ini merupakan referensi dan tidak menyediakan titik akhir mandiri\./m,
    /^Topik dokumentasi ini tidak memiliki konfigurasi waktu jalan sendiri\./m,
    /^この例は .+ の公開されたインターフェースを使います。/m,
    /^このコンポーネントには独立したコマンドラインのエントリーは宣言されていません。/m,
    /^このトピックは参考情報であり、独立したエンドポイントを提供しません。/m,
    /^このドキュメント自体には実行時の設定はありません。/m,
    /^Der Zugriff auf .+ unterliegt dem Aufrufer und dem zuständigen Funktionsdienst\./m,
    /^Akses .+ diatur oleh pemanggil dan gerbang pemilik\./m,
    /^.+ へのアクセスは呼び出し元と担当のゲートウェイが管理します。/m,
];

export function documentationBundleFiles(root) {
    return sourceFiles(resolve(root, "src")).filter(
        (path) =>
            /\/docs\//.test(path) &&
            /\/(?:README|INFO|USAGE|TECHNICAL)(?:\.(?:en|de|id|ja))?\.md$/.test(
                path,
            ) &&
            !path.includes("/changelog/"),
    );
}

export function contentIssues(prose) {
    const issues = emptyGuidance.some((pattern) => pattern.test(prose))
        ? ["Replace generic guidance with component-specific documentation"]
        : [];
    if (
        /\b(?:now (?:use|uses|means|record|accept|supports?|traverse|issues?|carry|validates?|register|return|reveals?|evaluates?|show|scroll|applies|rejects?|share|produce|separates?|expose|retain|provide|render|stops?|occupy|shares|begin|keep|opens?|commits?|enforce|fills?)|no longer|older .+ still work|previous(?:ly)? (?:used|returned|supported))\b/i.test(
            prose,
        )
    ) {
        issues.push(
            "Describe the current contract without release comparisons",
        );
    }
    if (
        /\b(?:retain|keep|preserve)s? (?:the )?same (?:topic )?(?:slugs|URLs|filenames)\b|\b(?:after|before) (?:this|the) (?:change|rename|refactor|fix)\b/i.test(
            prose,
        )
    ) {
        issues.push(
            "State the concrete document identity contract without rename history",
        );
    }
    if (
        /\b(?:jetzt|nun) (?:verwendet|nutzt|bedeutet|unterstützt|liefert|stellt|enthalten|gilt|wertet|zeigen|öffnet|prüft|übernimmt)\b|\b(?:kini|sekarang) (?:menggunakan|memakai|mendukung|memiliki)\b|ようになりました|変更前と同じ/i.test(
            prose,
        )
    ) {
        issues.push("Keep localized references free of release chronology");
    }
    return issues;
}

export function sourceReferenceIssues(markdown, root) {
    const issues = [];
    for (const match of markdown.matchAll(
        /https:\/\/(?:github\.com\/[^/\s]+\/[^/\s]+\/(?:blob|raw)|raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+)\/([^/\s]+)\/[^\s)<>"`]+/g,
    )) {
        if (match[1] !== "HEAD")
            issues.push(
                `GitHub file links must follow the default branch through HEAD: ${match[0]}`,
            );
    }
    for (const match of markdown.matchAll(
        /https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/(?:blob|raw)\/HEAD\/([^\s)<>"`#?]+)/g,
    )) {
        const source = decodeURIComponent(match[1]);
        const target = resolve(root, source);
        if (!target.startsWith(resolve(root) + "/") || !existsSync(target))
            issues.push(`GitHub source target does not exist: ${source}`);
    }
    const paths = new Set(
        [
            ...markdown.matchAll(/`(src\/[\w./-]+\.(?:ts|js|html|css|json))`/g),
        ].map((match) => match[1]),
    );
    return [
        ...issues,
        ...[...paths]
            .filter((path) => !existsSync(resolve(root, path)))
            .map((path) => `Documented source does not exist: ${path}`),
    ];
}

export function changelogFiles(root) {
    return sourceFiles(resolve(root, "src")).filter((path) =>
        /\/docs\/changelog\/[^/]+\.md$/.test(path),
    );
}

export function changelogLinkIssues(markdown) {
    const labels = [
        ...[...markdown.matchAll(/\[([^\]\n]+)\](?=[ \t]*(?:\(|\[|:))/g)].map(
            (match) => match[1],
        ),
        ...[...markdown.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(
            (match) => ({ html: match[1] }),
        ),
    ];
    return labels.some((label) =>
        typeof label === "string"
            ? /[0-9a-f]{40,}/i.test(label)
            : containsFullHtmlCommit(label.html),
    )
        ? [
              "Changelog link text must use a short commit reference, never a full SHA",
          ]
        : [];
}

function containsFullHtmlCommit(html) {
    let insideTag = false;
    let quote = "";
    let digits = 0;
    for (const character of html) {
        if (character === "<") {
            insideTag = true;
            continue;
        }
        if (insideTag) {
            if (quote) {
                if (character === quote) quote = "";
            } else if (character === '"' || character === "'") {
                quote = character;
            } else if (character === ">") insideTag = false;
            continue;
        }
        digits = /[0-9a-f]/i.test(character) ? digits + 1 : 0;
        if (digits >= 40) return true;
    }
    return false;
}
