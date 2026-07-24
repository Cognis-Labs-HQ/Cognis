# 検索ユーティリティの規約

共有 UI 検索コードは `src/ui/reuse/search-util/` に置き、互換性のため `src/ui/reuse/search-bar.js` から再エクスポートします。

検索対象を提供するコンポーネントは、検索連携を専用の `ui/search/index.js` にまとめてください。コンポーネント内容の Provider は `createSearchIndex`、ライフサイクルを持つ登録ヘルパーは `registerSearchIndex` という名前でエクスポートします。Provider は正規化済みのグループまたは項目を返し、クエリ照合、順位付け、ハイライト、フィルタリング、描画、古い非同期結果の破棄は共有ユーティリティに任せます。

大きな分類には CTX 検索フローの `visible-indexes`、`component-indexes`、`settings-index` を使います。メッセージ、投稿、ドキュメント、カレンダー予定などの取得は Provider 内で非同期に行い、完了したソースから順にポップアップへ結果を渡せるようにします。

検索可能な DOM には `data-search-label`、`data-search-text`、`data-search-category`、`data-search-result-class` を使ってください。新しいコンポーネントでは、場当たり的なファイル名や無関係なファイルに分散した検索関数を避けます。
