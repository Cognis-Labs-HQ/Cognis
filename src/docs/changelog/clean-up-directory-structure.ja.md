# PR変更履歴 — ディレクトリ構造の整理

## 概要

日本語学習コンテンツは言語モジュールで提供されるため、重複して混乱を招く
`src/adapters/study/japanese/` の旧Studyアダプターを削除しました。

Studyゲートウェイのアダプター探索/ブートストラップでは、レガシー用の
ハードコードされたスキップ条件を廃止し、汎用的な処理にしました。

プロフィールページでは、投稿公開範囲の案内をインラインヒント文から
情報ツールチップに置き換えました。

## 変更したファイル/コンポーネント

- Studyゲートウェイ:
    - `src/gateways/study/gateway.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/gateways/study/manifest.json`
- 削除したレガシーアダプター:
    - `src/adapters/study/japanese/`（削除）
- プロフィールUI:
    - `src/ui/app/profile/index.js`
    - `src/ui/styles/profile.css`

## コミット

- [e349311](https://github.com/le-firehawk/Cognis/commit/e349311)
