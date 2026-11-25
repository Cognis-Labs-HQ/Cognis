# 技術リファレンス

同期パスフレーズ機能は、暗号学的乱数で独立した単語を選び、単語数と書式の設定を検証します。

## インターフェース

reuse:generatePassphrase は文字列を返す同期 ctx 機能です。数や長さの不正は RangeError、型や表記方式の不正は TypeError です。

## 設定

words は 1～128 の安全な整数です。separator は既定がハイフンで十六文字まで、capitalization は lowercase（既定）、uppercase、titlecase です。

## 動作

### パスフレーズ機能

API ランタイムは `ctx` を通じて `reuse:generatePassphrase` を提供し、Jitsi Meet などのモジュールが API 内部をインポートせずに読みやすい秘密情報を生成できるようにします。

## セキュリティ

各単語を Node の crypto.randomInt で選びます。生成は保存や承認を行わず、呼び出し元が保護し、結果をログに残してはいけません。

## リファレンス

### 技術仕様

この capability は、正の単語数を示す `words` と、省略可能な `separator` および `capitalization` を受け取ります。大文字・小文字の形式には `lowercase`、`uppercase`、`titlecase` を指定でき、既定では小文字の単語をハイフンで区切ります。

ジェネレーターは Node.js の暗号学的乱数を使って各単語を選択します。呼び出し元はセキュリティ要件に十分な単語数を指定し、生成したパスフレーズをログへ記録しないでください。
