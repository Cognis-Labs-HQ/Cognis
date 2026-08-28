# API 接続断時にページ更新を促す常駐トースト

## 概要

サーバー再起動やネットワーク断などで認証済み API 接続が失敗した場合（ネットワークエラー、または再試行対象の 5xx 応答）に、ページ更新を促す常駐の警告トーストを追加しました。

ページコンポーザーは翻訳済みの共通更新プロンプトを設定するようになり、ダッシュボード全体でローカライズされた警告を表示します。

## 変更ファイル / コンポーネント

- `src/ui/reuse/api-client.js` — 共通の接続復旧トースト処理とプロンプト設定を追加。
- `src/ui/reuse/page-composer/init.js` — ページ初期化時に翻訳済み接続復旧プロンプトを登録。
- `src/ui/languages/en/strings.xml`
- `src/ui/languages/de/strings.xml`
- `src/ui/languages/id/strings.xml`
- `src/ui/languages/ja/strings.xml`
- `src/ui/reuse/tests/api-client.test.js` — 常駐更新トースト動作のリグレッションテストを追加。

## コミット

- https://github.com/Cognis-Labs-HQ/Cognis/commit/bbee24a
- https://github.com/Cognis-Labs-HQ/Cognis/commit/3b7bded
