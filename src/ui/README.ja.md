# Cognis UI

## 構成

- `src/layouts/`: 再利用可能なページレイアウトのガードレール。
- `src/reuse/`: 共有ユーティリティ。
- `public/templates/`: JS からインポートされ、静的アセットとして配信される HTML テンプレート。
- `src/app/`: ページ動作（study アプリ画面、login、docs、admin/settings/modules）。

## UX モデル

ページ（login を除く）はレイアウトモジュール経由で描画し、行/列のガードレールを一貫させつつ、ウィジェットのカスタマイズ性を維持します。

## API 駆動機能

- login は `/api/v1/auth/login` を使用。
- 製品 docs UI は `/api/v1/docs` を読み込み。
- ユーザーページ設定は `/api/v1/social/users/:accountId/preferences/:pageId` を使用。

## 国際化（i18n）

ユーザーに表示されるすべてのテキストは i18n ヘルパー経由で解決し、JS や HTML テンプレートにハードコードしてはいけません。

### 新しい文字列の追加

1. `src/ui/languages/<locale>/strings.xml` の各言語パックにキー/値を追加します。まず `en` から始めます。

    ```xml
    <string name="ui.app.mypage.my_label">My label</string>
    ```

2. 複数ページで使うラベルには `ui.reuse.*` キーを、ページ固有の文言には `ui.app.<page>.*` を使用します。

3. JS では `i18n.t()` で値を取得します。

    ```js
    const i18n = await createI18n();
    element.textContent = i18n.t("ui.app.mypage.my_label");
    ```

4. 静的 HTML テンプレートでは `data-i18n` 属性を追加し、描画後に `applyStaticTranslations(i18n)` を一度呼び出します。

    ```html
    <span data-i18n="ui.app.mypage.my_label"></span>
    ```

    ```js
    applyStaticTranslations(i18n, root);
    ```

    `placeholder` 属性には `data-i18n-placeholder`、`aria-label` 属性には `data-i18n-aria-label` を使用します。

### 対応属性

| 属性                    | 設定先                |
| ----------------------- | --------------------- |
| `data-i18n`             | `element.textContent` |
| `data-i18n-placeholder` | `element.placeholder` |
| `data-i18n-aria-label`  | `element.ariaLabel`   |

### 言語ファイル

言語パックは `src/ui/languages/<iso>/strings.xml` にあります。ランタイムは必要時に読み込み、セッション中はキャッシュします。ユーザーの言語設定は `localStorage` と cookie に保存され、Settings ページで変更できます。

フォールバック順: 優先言語（優先順）→ `en`。

### 検証

`src/ui/tests/hardcoded-strings.test.js` では次の 2 つを検査します。

- **Quoted string literals** — ユーザー向けに見える複数語文字列のシングル/ダブルクオート文字列リテラル（キー参照を除く）を検出します。
- **HTML template text nodes** — テンプレートリテラル内の HTML タグ間テキスト（例: `<th>ID</th>`）を走査し、`i18n.t()` の埋め込みなしで英字を含むケースを検出します。

実行コマンド:

```
node --test src/ui/tests/hardcoded-strings.test.js
```

`src/ui/app` と `src/ui/layouts` にコミットされるコードは、両方の検査を通過する必要があります。

## 詳細設定の編集

詳細設定 → 設定では、一度だけ安全確認に同意すると、UI 設定の全文書を JSON として編集できます。有効な変更は通常の設定システムを通じて保存、適用されます。リリースノートの確認記録は、この文書の妨げにならないよう別に保存されます。
