# アダプター管理コントロール契約を必須化

## 概要

Administration のアダプター操作を整理し、ゲートウェイがアダプターの設定・切り替えエンドポイントを明示し、Registration アダプターが空の設定保存を受け付け、Study アダプターが disable 処理を公開するようにしました。

Administration ページは公開されたアダプター制御情報を使うようになり、リフレッシュ後にトグル状態を再同期するため、最後の有効アダプターを無効化したときでもゲートウェイのスライダー表示が Disabled 状態と一致します。

## 変更したファイル / コンポーネント

- `src/api/reuse/adapter-admin-controls.ts` — アダプターの config / enable / disable / 任意の test エンドポイントを通知する共通 API ヘルパーを追加しました。
- `src/ui/app/administration/index.js` — Administration UI を公開済みアダプター制御情報に切り替え、page-composer の再描画後にゲートウェイとアダプターのトグル状態を再同期するようにしました。
- `src/gateways/registration/bootstrap.ts`、`src/gateways/study/bootstrap.ts`、`src/gateways/social/bootstrap.ts`、`src/gateways/notify/bootstrap.ts` — ゲートウェイのアダプター一覧で管理エンドポイントを通知し、欠けていた Registration / Study の管理ルート処理を追加しました。
- `src/gateways/study/gateway.ts` — Study アダプターの runtime enable / disable サポートと、`enabled` フラグを尊重する設定保存処理を追加しました。
- `src/gateways/registration/tests/bootstrap.test.ts` と `src/gateways/study/tests/bootstrap.test.ts` — 公開された制御情報と修正済みアダプター管理ルートを固定する回帰テストを追加しました。
- `.github/copilot-instructions.md`、`src/gateways/{notify,registration,social,study}/manifest.json`、`src/docs/versions.en.md` — アダプター管理コントロール要件を文書化し、影響したゲートウェイのバージョンを更新しました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6b706ae
