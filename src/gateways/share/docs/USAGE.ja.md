# 使用例

共有 の実践的な操作手順です。

## 前提条件

対象が共有を許可し、対応する共有方式が有効である必要があります。

## 使用例

リンクかユーザーを選び、権限と保護を確認して保存し、相手として試します。不要な共有は確認後に取り消します。

```sh
cognisctl share:tokens --help
cognisctl share:resolve --help
cognisctl share:recipients:users --help
cognisctl share:approvals:pending --help
```

`uiCtx` をインポートして `share:uiClient` を要求し、`getGuestProfile()` を呼び出します。返された `Response` を確認してから `{ data }` JSON ペイロードを読み取ります。

## 期待される結果

宣言された内容だけにアクセスでき、ゲストのセッションは通常のアカウントにはなりません。

## 問題の解決

期限、パスワード、相手、現在の権限を確認してください。古いリンクが残っていても取り消し後はアクセスできません。
