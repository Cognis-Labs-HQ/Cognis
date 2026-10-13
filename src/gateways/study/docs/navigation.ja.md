# Study のナビゲーション

Flashcards は `/study/<iso>/flashcards` と `/study/<iso>/flashcards/<deck-id>` を使用します。言語の切り替えは該当する一覧を開き、別言語のデッキを引き継ぎません。`/study/flashcards` は現在の言語を解決します。ライブラリーとリクエストは共通ページのままです。

## 使用例

`/study/ja/flashcards` で日本語のデッキを開き、英語を選ぶと `/study/en/flashcards` を開きます。

## 技術仕様

ギャラリーはパスから言語を解決し、Study の公開契約で表示可能なデッキを絞り込みます。詳細 URL は言語とデッキ UUID を示し、言語変更時は対応するギャラリーへ戻ります。一時的なクエリデータを URL に持ち込みません。
