# 文書の差分

文書の差分により、モジュールはユーザーが新版に対応する前に、二つの変更不可能な文書バージョン間の違いを説明できます。

## 使用例

`docs:versionStore` 機能で作成したストアから `store.diff(fromVersion, toVersion)` を呼び出します。ランタイムモジュールは独自の認証済みルートから構造化された結果を返し、ブラウザ ctx から `ui:documentDiff` を取得して、その結果を `renderDocumentDiff(diff)` に渡せます。

## 技術仕様

両方のハッシュがストアの名前空間に存在し、同じ文書スラッグに属している必要があります。結果には比較元と比較先のハッシュ、共通スラッグ、および `unchanged`、`added`、`removed`、`changed` に分類された順序付きの行が含まれます。変更された項目には以前の文章と置換後の文章の両方が含まれます。

ブラウザレンダラーは動的な文章をエスケープし、追加を緑、変更をオレンジ、削除を赤で表示します。

## Markdown 比較ビュー

ブラウザーの `ui:documentDiff` Capability が提供する `renderMarkdownDocumentDiff(diff)` を使用すると、変更後の文書全体を Host の Markdown Renderer で描画できます。変更されていない内容は通常の文書表示を維持し、追加、置換、削除には緑、オレンジ、赤の Overlay と概要バーのナビゲーションが適用されます。 Renderer は比較内容全体を 1 回の Markdown 処理で描画するため、変更行をまたぐ Fenced Code Block、リスト、引用などの構造が維持されます。
