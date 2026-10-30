# ライブラリの構造化インポート

## 使用方法

カード種別選択画面の左下にある **インポート** から JSON をアップロードします。バッチ全体の書き込み先範囲を選びます。形式は `format: "cognis-library"`、`version: 1`、空でない `entries` 配列です。

## 技術仕様

各項目には一意のローカル `key`、導入済みの `schemaId`、`layer`、`label`、その層で必須の全フィールドと関連が必要です。Cognis はコンストラクターの既定値と現在のスキーマ版を適用します。定義の翻訳キーは自動生成します。基本文字と助詞は提供者専用です。筆順は作成画面と同じ検証済みの構造化形式を使用する必要があります。

```json
{
    "format": "cognis-library",
    "version": 1,
    "entries": [
        {
            "key": "room-definition",
            "schemaId": "japanese-core",
            "layer": "definitions",
            "label": "room",
            "fields": {
                "translations": {
                    "en": "room"
                }
            }
        },
        {
            "key": "classroom",
            "schemaId": "japanese-core",
            "layer": "words",
            "label": "教室",
            "fields": {
                "pronunciation": ["きょうしつ"]
            },
            "references": [
                {
                    "relation": "definitions",
                    "entryId": "room-definition"
                }
            ]
        }
    ]
}
```

`references` や `referenceGroups` の `entryId` には別項目の `key` を指定できます。Cognis は UUID を先に割り当ててキーを置換し、依存先が揃った項目を層ごとのバッチで処理します。既存 UUID の参照先は移入先範囲で閲覧可能である必要があります。参照先欠落、層の不一致、循環、不正な筆順、必須項目不足、重複内容はトランザクション全体を取り消します。応答には作成項目と UUID 対応表 `ids` が含まれます。

カードの上限はタグ 8 件、読み 16 件、定義 10 件です。フィールド長と各層の関連数制限も適用します。JSON インポートでは検証し、辞書インポートでは余分な値を保存前に削減します。作成画面では 11 件目の定義を追加できません。
