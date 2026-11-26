# 使用例

文書一式を作成または更新し、提出する前に必須の構成を検証します。

## 前提条件

担当するコンポーネントまたはコアのトピックを決め、実装と照らして対応する操作を確認します。`en`、`de`、`id`、`ja` の4言語を準備します。

## 使用例

`.github/documentation/` から各言語の3種類のテンプレートを担当コンポーネントの `docs/` ディレクトリへコピーします。コアでは `src/docs/` 内のトピック用ディレクトリを使い、README テンプレートを INFO に改名します。大文字の基本名と言語接尾辞を維持します。説明用の指示を正確な内容に置き換え、[構成表](/docs/standard/technical)の見出しをそのまま使います。

コンポーネントのマニフェストには英語の README、USAGE、TECHNICAL のパスを宣言します。コアのトピックはディレクトリから検出するため、専用のマニフェストは不要です。リポジトリのルートで次を実行します。

```sh
npm run check:docs
node --experimental-vm-modules --import tsx --test src/tooling/tests/documentation/*.test.js
```

## 期待される結果

文書チェックは `Component documentation bundles and requested branch comparison are valid.` と表示します。テストは配布文書一式を検証し、変更を加えた不正な構成を拒否します。各言語の標準にある見出し表は検証スキーマと一致する必要があります。

## 問題の解決

`Required H2 order` の場合は、役割と言語に対応する正確な見出しと順序に戻します。`Empty section` または `Missing introductory paragraph` の場合は、コンポーネントに即した表示内容を書きます。コメントは内容になりません。コードの閉じる記号は開始と同じ文字を必要な長さで使います。コードとエンドポイント仕様は Info から移します。リンクの検証に失敗した場合は、役立つ参照を削除せず、参照元または参照先を修正します。
