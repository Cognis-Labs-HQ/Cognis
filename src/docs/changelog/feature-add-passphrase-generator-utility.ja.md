# 再利用可能なパスフレーズ

**機能ブランチ:** feature-add-passphrase-generator-utility

## モジュール向け capability

呼び出し元が単語数、区切り文字、大文字・小文字の形式を指定できる、暗号学的にランダムな単語パスフレーズ生成機能を追加しました。API ランタイムはこれを `ctx` から公開するため、Jitsi Meet などのモジュールは API 内部をインポートせずに読みやすい秘密情報を生成できます。

## コミット

- [再利用可能なパスフレーズ capability を追加](https://github.com/Cognis-Labs-HQ/Cognis/commit/ff93a1df)
- [パスフレーズ文書の見出しを統一](https://github.com/Cognis-Labs-HQ/Cognis/commit/b78a79d9)
- [パスフレーズ capability の使用方法を文書化](https://github.com/Cognis-Labs-HQ/Cognis/commit/cca3201a)
- [パスフレーズ文書の例を整形](https://github.com/Cognis-Labs-HQ/Cognis/commit/10d19e66)
