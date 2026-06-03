# 保留したフィードバック項目

## コードレビュー — コンパクトナビゲーションの読み込みループ

### dashboard-layout-menu.test.js コンパクトナビゲーションの安定性 — Observer のランタイムテストを追加

**レビュアーの提案:** コンパクトナビゲーションのガードに対するソースベースのアサーションを、Observer を繰り返し発火させてもナビゲーションがループせず安定することを確認するランタイムテストに置き換える。

**保留した理由:** このリポジトリの `dashboard-layout.js` 向け UI テストハーネスは現在ソースとフィクスチャ中心で、より大きなテスト基盤変更なしに `applyCompactNav()` を直接実行できる軽量な DOM / ランタイムローダーがまだありません。今回の修正では対象を絞ったソースベースの回帰アサーションを維持し、より重いランタイムハーネス作業は別タスクに回して、読み込みループ修正そのものを先に出せるようにしました。

### messages/ui/app.js wrapComposerSelection の JSDoc — 選択時とカーソル時の挙動を詳述

**レビュアーの提案:** `wrapComposerSelection()` がテキスト選択時とキャレットのみのときにどう振る舞うかを説明する、より詳細な JSDoc を追加する。

**保留した理由:** この指摘は `src/adapters/social/messages/ui/` を対象としており、コンパクトナビゲーション回帰の範囲外です。リポジトリのバージョン規則では、そのアダプターに触れると文書だけのフォローアップでも無関係なアダプター版数と changelog の更新が必要になるため、今回は変更しませんでした。

### messages/ui/app.js テンプレート挿入経路 — applyTemplateToComposer ロジックの重複解消

**レビュアーの提案:** 3288-3291 行付近のテンプレート挿入経路では、同じ composer 更新ロジックを繰り返す代わりに既存の `applyTemplateToComposer` ヘルパーを使う。

**保留した理由:** これは `src/adapters/social/messages/ui/` 内のアダプター局所リファクタリングであり、今回修正しているコンパクトナビゲーションの読み込みループ回帰には影響しません。このパッチに含めると別件の messages アダプター cleanup に範囲が広がり、無関係なバージョン/ changelog 作業が必要になるため、専用の追跡タスクへ回しました。

### dashboard-layout.js compact-nav ヘルパー配置 — 入れ子ヘルパーを applyCompactNav に移動

**レビュアーの提案:** `getNavEntries`、`isOverflowManaged`、`syncOverflowVisibility`、`syncDomOrder` はモジュールスコープにあるので `applyCompactNav()` の中へ移動する。

**保留した理由:** 誤検知です。これら 4 つのヘルパーはすでに `applyCompactNav()` の内側にあり、そこで `topnav` と compact-nav 状態を閉じ込めています。「`applyCompactNav()` の中へ移動する」ことは現在のスコープと同じなので実質的に何も変わりません。
