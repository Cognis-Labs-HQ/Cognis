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
    return emptyGuidance.some((pattern) => pattern.test(prose))
        ? ["Replace generic guidance with component-specific documentation"]
        : [];
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
        ...[...markdown.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map((match) =>
            match[1].replace(/<[^>]+>/g, ""),
        ),
    ];
    return labels.some((label) => /[0-9a-f]{40,}/i.test(label))
        ? [
              "Changelog link text must use a short commit reference, never a full SHA",
          ]
        : [];
}
