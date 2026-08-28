# 創設者向け Invite メニュー項目から管理者を除外

## 概要

Registration ナビゲーションバーの Invite 項目の表示条件を更新し、管理者相当の権限を持つ創設者ユーザーには Invite 項目を表示しないようにしました。

管理者と owner は Users ページで招待を管理できるため、Invite のクイックリンクは非管理者の創設者だけに表示されます。

## 変更したファイル / コンポーネント

- `src/gateways/registration/ui/navbar.js` — 管理者ロール（`admin` と `owner`）の正規化を追加し、Invite 表示判定に適用しました。
- `src/gateways/registration/tests/navbar.test.js` — Invite メニューから管理者相当の創設者を除外する回帰テストを追加しました。
- `src/gateways/registration/bootstrap.ts`、`src/gateways/registration/manifest.json`、`src/docs/versions.en.md` — Registration ゲートウェイのコンポーネントバージョンを `1.1.7` に更新しました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/041fdb8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d47ee73
