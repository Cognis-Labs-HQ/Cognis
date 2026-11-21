# 使用例

メール配信 の実践的な操作手順です。

## 前提条件

管理者は SMTP 接続と利用可能な送信元を用意します。

## 使用例

ホスト、ポート、暗号化、送信元を入力し、通常配信の有効化前にテスト送信します。

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## 期待される結果

成功はその宛先への配信を確認します。アカウントのメールには確認とカテゴリーの方針も適用されます。

## 問題の解決

テスト結果、TLS、認証情報、受信箱を確認してください。接続成功だけでは受信箱への到達は保証されません。
