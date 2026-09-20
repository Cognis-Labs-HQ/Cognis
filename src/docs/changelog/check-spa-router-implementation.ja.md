# PR変更履歴 — SPAルーター実装チェック

**機能ブランチ:** copilot/check-spa-router-implementation

## 概要

ページエントリーポイントのSPA整合性を見直し、招待ページのルーター
対応を追加するとともに、認証ページと招待ページで `mount()` +
直接読み込みガードのパターンを統一しました。

あわせて、ログイン/登録ページのコンポーザーメタデータを必須の
`pageContext`（タイトル + サブタイトル）に合わせ、モジュール一覧を
小画面でも扱いやすいレスポンシブ表コンテナへ改善しました。

その後の追補として、初期シェル描画をブロックしていた処理も削減し
ました。ダッシュボードテンプレートは事前ウォームされ、ナビバー
プラグインの読み込みは遅延実行され、ページ内容は保存済みレイアウト
設定の取得完了を待たずに初回描画されます。

メッセージ、クラス、マイクラスのアダプターページの `pageContext` に
欠落していた `subtitle` フィールドを追加し、すべてのページコンテキストに
i18n キーで解決されたタイトルとサブタイトルの両方を必須とするAI指示への
完全準拠を達成しました。

ひらがな一覧のStudyコンポーネントを修正しました。`createI18n` の呼び出しに
`componentStringBaseUrls` がなく（gateway文字列が読み込まれていなかった）、
英語のページタイトルが直接コードに埋め込まれており、サブタイトルも存在せず、
要素ラベルとレンダリングコンテンツにも英語文字列が直接埋め込まれていました。
これらすべての問題を `gateway.study.*` i18n 名前空間で解決しました。

英語アルファベットコンポーネントの直接埋め込みページタイトルも同様に修正
しました。

対応するすべての i18n キーを4つのサポート言語（de・en・id・ja）に追加
しました。グローバル `strings.xml` ファイルには言語ごとに3つの新しい
サブタイトルキーを、Study ゲートウェイの `strings.xml` ファイルには
言語ごとに5つの新しいキーをそれぞれ追加しました。

Study ゲートウェイのブートストラップにおけるすべての逐次サーバーサイド
I/O 処理を並列化し、Node.js がブラウザリクエストを処理できなくなっていた
2〜5秒の起動遅延を解消しました。4つの探索・ブートストラップフェーズは
`Promise.all` を使って各エントリの処理を並行実行するようになり、独立した
2つのフェーズ（アダプターブートストラップと言語モジュールブートストラップ）
も互いに並行して実行されます。

`LanguageLibraryStore.#loadDataFiles()` のすべてのファイル読み込みを並列化
しました。すべての文字クラスファイルが同時に読み込まれ、4つのデータレイヤー
ファイル（alt-characters・definitions・words・sentences）が逐次ではなく、
1つの `Promise.all` 呼び出しでまとめて読み込まれます。

`main.ts` のサーバー起動時における2つの `scanManifestDir` 呼び出しを
並列化しました。

使用されていない Dead Code ディレクトリ `ja/library/` を削除しました。
その型定義と再エクスポートは共有の `reuse/library-store.ts` で置き換えられ
ており、どこからもインポートされていませんでした。

## 変更コンポーネントとファイル

- ルーターとSPAテスト:
    - `src/ui/reuse/app-router.js`
    - `src/ui/tests/app-router.test.js`
- シェル/レイアウト性能:
    - `src/ui/layouts/dashboard-layout.js`
    - `src/ui/reuse/page-composer/init.js`
    - `src/ui/tests/page-composer-refresh.test.js`
- ページエントリーポイント:
    - `src/ui/app/invite/index.js`
    - `src/ui/app/login/index.js`
    - `src/ui/app/register/index.js`
    - `src/ui/app/modules/index.js`
- UI言語リソース:
    - `src/ui/languages/en/strings.xml`
    - `src/ui/languages/de/strings.xml`
    - `src/ui/languages/id/strings.xml`
    - `src/ui/languages/ja/strings.xml`
- 新しい共有サーバーレスポンスヘルパー:
    - `src/api/reuse/json-responses.ts` (新規)
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
- 新しい共有クライアントサイド暗号化ユーティリティ:
    - `src/ui/reuse/crypto-utils.js` (新規)
    - `src/adapters/social/messages/ui/app.js`
    - `src/adapters/notify/internal/ui/navbar-plugin.js`
- 新しい共有Study言語ユーティリティ:
    - `src/modules/study/languages/reuse/language-utils.js` (新規)
    - `src/gateways/study/ui/study.js`
    - `src/modules/study/languages/reuse/study-sub-navigation.js`
- CSS変数の修正:
    - `src/adapters/notify/internal/ui/notifications.css`
    - `src/gateways/notify/ui/verify-email.css`
- ロール述語を `src/ui/reuse/access-role.js` に集約:
    - `src/ui/reuse/access-role.js` — `isAdminScope`、`isTeacherScope`、`isStudentScope` を追加
    - `src/modules/study/languages/reuse/language-utils.js` — access-role.js から再エクスポートに変更
    - `src/modules/study/languages/reuse/classroom-page.js` — `getRoleFlags()` を削除
    - `src/adapters/study/classes/ui/app.js` — ローカルロールクロージャを削除、`renderMemberItems()` ヘルパーを抽出

- アダプター所有ページ向けの動的SPAルート検出:
    - `src/api/ui-registry.ts` — `SpaRoute` レジストリを追加（`registerSpaRoute` / `listSpaRoutes`）
    - `src/api/routes/ui/index.ts` — 認証付き `GET /api/v1/ui/app-routes` エンドポイントを追加
    - `src/ui/reuse/spa-route-registry.js`（新規）— クライアント側ルートローダー/キャッシュ
    - `src/ui/reuse/app-router.js` — アダプタールートを静的テーブルから削除し、静的 + 登録済みルートで解決
    - `src/gateways/social/bootstrap.ts` と `src/gateways/study/bootstrap.ts` — SPAルート登録をアダプターブートストラップ文脈へ受け渡し
    - `src/adapters/social/messages/index.ts`, `src/adapters/social/profile/index.ts`, `src/adapters/study/classes/index.ts` — アダプター自身がSPAルートを登録
    - `src/api/tests/ui/ui-registry.test.ts`, `src/api/tests/ui/ui-routes.test.ts`, `src/ui/tests/app-router.test.js` — モジュラーなルート登録向けにテストを更新

## コミット

- [5028bb9](https://github.com/Cognis-Labs-HQ/Cognis/commit/5028bb9)
- [ad0f87b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad0f87b)
- [903e3f3](https://github.com/Cognis-Labs-HQ/Cognis/commit/903e3f3)
- [1f2451b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f2451b)
- [18e5b71](https://github.com/Cognis-Labs-HQ/Cognis/commit/18e5b71)
