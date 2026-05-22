# ページコンポーザーのフォーム下書きを保持して管理

## 概要

- フォーム値はレスポンシブ再レンダリング時だけでなく、ページ全体の再読み込み後も
  ユーザー単位・ページ単位の下書き保存によって復元されるようになりました。
- 永続下書きはメイングリッドコンポーザーとネストされたサブコンポーザーの両方で有効です。
- 機密性の高いフィールド種別と識別子は永続保存の対象外です。
- 大きなフォームには **下書きをリセット** アクションが追加され、
  保存済み入力が煩わしい場合にすぐ消去できます。

## 変更されたファイル/コンポーネント

- `src/ui/reuse/page-composer/init.js`
- `src/ui/tests/page-composer-refresh.test.js`
- `src/ui/styles/page-builder.css`
- `src/ui/languages/{en,de,id,ja}/strings.xml`
- `src/docs/page-composer.{en,de,id,ja}.md`

## コミットリンク

- https://github.com/le-firehawk/Cognis/commit/9888e39
- https://github.com/le-firehawk/Cognis/commit/b42d6d9c
- https://github.com/le-firehawk/Cognis/commit/1cabb35b
