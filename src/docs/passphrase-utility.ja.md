# パスフレーズ機能

API ランタイムは、Jitsi Meet などのモジュール向けに `ctx` を通じて `reuse:generatePassphrase` を提供します。この capability は、正の単語数を示す `words` と、省略可能な `separator` および `capitalization` を受け取ります。大文字・小文字の形式には `lowercase`、`uppercase`、`titlecase` を指定でき、既定では小文字の単語をハイフンで区切ります。

ジェネレーターは Node.js の暗号学的乱数を使って各単語を選択します。呼び出し元はセキュリティ要件に十分な単語数を指定し、生成したパスフレーズをログへ記録しないでください。
