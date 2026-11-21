# 技術リファレンス

コンソールログ の公開インターフェースと運用規則を説明します。

## インターフェース

独立した管理サービスではなく、担当のゲートウェイを通じて設定します。

## 設定

`level` はログのゲートウェイが提供するレベルのいずれかです。`format` は `pretty` または `json` を受け付けます。

## 動作

検証された値をログの設定の `consoleLevel` と `consoleFormat` に渡します。この組み込みアダプターはロックされ、マニフェストには独立した無効化操作がありません。

## セキュリティ

配信や保存の設定を変更できるのは管理者のみです。クライアントのリクエストには、担当のゲートウェイが確認する認証とリソースの権限が適用されます。

## リファレンス

- [src/adapters/logging/console/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/manifest.json)
- [src/adapters/logging/console/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/package.json)
- [src/adapters/logging/console/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/1dcd65eaa5b187007735ca3b527b797758aae884/src/adapters/logging/console/index.ts)
