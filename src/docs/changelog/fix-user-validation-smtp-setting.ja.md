# 利用できないアダプターに対するSMTPユーザー検証の保護

**機能ブランチ:** copilot/fix-user-validation-smtp-setting

## SMTPアダプターが有効でない場合、SMTPユーザー検証をブロック

管理 > セキュリティのユーザー検証方式ドロップダウンは、通知ゲートウェイにアクティブなSMTPアダプターが登録されていない場合、SMTPオプションを無効にして利用不可として表示するようになりました。SMTPが利用できない状態でAPIを通じて設定を保存しようとした場合、サーバーは明示的なエラーでリクエストを拒否し、不正な設定が保存されるのを防ぎます。

## コミット

- [2e0c0df](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e0c0df105ae0df41e5ce90bef8169bd1c6706d7)
