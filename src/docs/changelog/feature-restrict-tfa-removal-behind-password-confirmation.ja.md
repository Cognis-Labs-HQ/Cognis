# TFA 削除の確認

**Feature Branch:** feature-restrict-tfa-removal-behind-password-confirmation

## パスワードで TFA 削除を保護

現在のアカウントから有効な二要素認証方式を削除する際、設定変更を適用する前に既存のパスワード再確認機能を使用するようになりました。確認をキャンセルした場合、保留中のセキュリティ設定は変更されません。

## SMTP 設定でメール要件を説明

SMTP二要素認証の設定時に、一般的な設定エラーではなく、確認済みのメインメールアドレスが必要であることを示す警告を表示するようになりました。

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/f524f2f62820dbbf6ff80366a835aca0f31d3359
