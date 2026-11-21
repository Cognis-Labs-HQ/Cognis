# 技術リファレンス

ログファイル の公開インターフェースと運用規則を説明します。

## インターフェース

独立した管理サービスではなく、担当のゲートウェイを通じて設定します。

## 設定

`level` はゲートウェイが対応するレベルです。`rotateMaxBytes` は有限の正数、`rotateMaxFiles` はゼロ以上の整数、`rotateCompress` は真偽値です。

## 動作

`fileLevel` と、ローテーションの `maxBytes`、`maxFiles`、`compressRotated` を提供します。ファイルの保存とローテーションはログのゲートウェイが担当します。

## セキュリティ

配信や保存の設定を変更できるのは管理者のみです。クライアントのリクエストには、担当のゲートウェイが確認する認証とリソースの権限が適用されます。

## リファレンス

- [src/adapters/logging/file/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/manifest.json)
- [src/adapters/logging/file/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/package.json)
- [src/adapters/logging/file/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/file/index.ts)
