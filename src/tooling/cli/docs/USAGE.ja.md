# 使用例

コマンドラインツール の実践的な操作手順です。

## 前提条件

cognisctl と、保護された操作に必要な認証トークンを用意します。

## 使用例

`cognisctl system:health` と `cognisctl component:list` を試し、変更前に担当コンポーネントのヘルプを読みます。

```sh
cognisctl --help
```

## 期待される結果

サーバーの結果を表示し、HTTP と同じアカウント権限を確認します。

## 問題の解決

接続先と COGNIS_CLI_TOKEN_PATH を確認し、トークンやパスワードを共有出力に含めないでください。
