# 準拠と管理画面整理

**Feature Branch:** copilot/comply-codebase-instructions

## 管理のセキュリティを統合

Administration → Authentication の独立セクションを、auth 管理セクション登録の停止により削除しました。パスワードポリシーは、信頼済みドメイン・公開登録・検証方式・教師承認設定と同じ Administration → Security に統合しました。

## 冗長な認証UIを削減

削除した Authentication セクション専用だった旧 auth 管理アセットを削除しました。保守負荷を下げ、重複した設定画面を解消します。

## 準拠ガードレールのテスト追加

UI/app と API/routes のディレクトリ規約、1000 行超の新規ソースファイル防止、限定的な既存例外を除く core/api から gateway への直接結合防止を検証するアーキテクチャ準拠テストを追加しました。

## Ctx優先の認証配線を強化

サーバーとモジュール拡張ルートは、暗黙フォールバックではなく注入されたルート認証コンテキストを利用するよう更新しました。認証ルートコンテキストが無い場合は起動時に即時失敗します。

## AI指示の優先事項を明確化

AI 指示に、LOC 規律、大規模差分を成功指標にしない方針、汎用命名、真の reuse 境界、HTML と JS/TS の分離、1000 行超ファイルのディレクトリ分割を明示しました。

## Commits

- [a267b4c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a267b4cce59173b5060e5035a628583868afa39e)
