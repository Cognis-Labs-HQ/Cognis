# Study 言語パック

## 概要

Study 言語は、manifest、利用側定義のライブラリスキーマ、言語データ、文書からなる宣言的コンテンツパックです。ブラウザー UI、API route、store、CSS、言語固有ページを含めません。Cognis の Study アダプターがスキーマと表示メタデータから UI を生成します。

## パック契約

最小 bootstrap はインストールルートを特定し、`ctx` 経由で `study:library.ingestContentPack(root)` を呼ぶだけです。ライブラリ内部を import しません。ファイル検出、安全なパス、検証、安定 ID、transaction、冪等性、logging、永続化はライブラリアダプターが所有します。resolver と外部辞書は別アダプターです。

## 必須構造

```text
cognis-language-ja/
  package.json
  manifest.json
  schema.json
  content/
    characters/hiragana.json
    symbols/common.json
    definitions/core.ja.json
    words/beginner-01.json
    sentences/beginner-01.json
  docs/standard.ja.md
```

manifest は `id`、`publisher`、`version`、`contentRevision`、相対 `schema`・`content` パス、license を持ちます。パスはパックルート外へ出られません。同じ発行者、パック ID、version で異なる内容は拒否されます。

## スキーマと内容

スキーマは安定 ID、正の version、BCP 47 言語、任意数のレイヤーを定義します。レイヤーは型付き field と、対象、多重度、順序、任意 resolver を持つ方向付き関係を宣言します。レイヤー名は利用側所有であり、英語は文字、韓国語は字母と音節ブロックを定義できます。

`content/` 直下の各ディレクトリ名はレイヤー ID と一致します。JSON はレコード配列または `{ "records": [...] }` です。レコード ID はパック内で不変で、関係はその ID と必要な位置を参照します。Cognis は書き込み前にグラフ全体を検証します。

## 取り込みと UI

`inspectContentPack` は決定的な順序で読み、安全なパス、スキーマ、field、関係を検証して digest を計算します。`ingestContentPack` はスキーマ、レコード、edge、receipt を一つの transaction で保存します。同一内容の再導入は未変更として成功し、同じパック version の内容変更は拒否します。

汎用 Study アダプターが browser、detail、文字体系、lexicon、文 composer、関係 view を生成します。パックは宣言的な表示ヒントを持てますが、template、script、CSS は提供しません。tokenizer、Hangul 分解、形態解析、外部 lookup は `ctx` 接続アダプターに置きます。
