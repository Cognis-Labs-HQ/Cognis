# 言語フレームワークの学習

## 概要

Study Language Framework は、言語学習コンテンツが Cognis でどのように構造化、登録、配信されるかを定義します。これは、Study ゲートウェイ (インフラストラクチャ) を個々の言語モジュール (コンテンツ) から分離し、各言語のコア ライブラリ (言語内のすべての文字、単語、定義の正規参照) をその子コンポーネント (インタラクティブな学習アクティビティ) から分離する階層型アーキテクチャを提供します。

**言語モジュール**は、ブートストラップ時に Study ゲートウェイに自身を登録する自己完結型の TypeScript パッケージです。これは、データベースや通知システムなどのインフラストラクチャ関連で使用されるアダプター パターンに従いません。代わりに、これはコンテンツ モジュールであり、その主な仕事は、言語ライブラリを設定して公開し、UI が子コンポーネントに移動できるようにその子コンポーネントをアドバタイズすることです。新しい言語を追加するということは、新しいモジュール ディレクトリを追加することを意味します。 Study ゲートウェイは自動的にそれを検出します。

フレームワークは細分化されるように設計されています。開発者は、コア言語モジュールに手を加えることなく、単一の子コンポーネント (例: ひらがなクイズ、漢字書き順ビューア) を追加することで言語を拡張できます。各子コンポーネントは、ユーザーがその言語を選択したときに [スタディ] ページの下に表示されるサブナビゲーション エントリを自己登録します。

## 責任

- すべての言語モジュールが実装する必要がある規約を定義します。
- ライブラリ データ モデルを定義します。文字、代替文字、定義、単語、および文章の階層化されたレジスタです。
- 子コンポーネントがサブナビゲーション ページを登録し、ライブラリと統合する方法を定義します。
- Study ゲートウェイが言語モジュールを検出し、UI に公開する方法を指定します。
- 投稿者がシステム全体を理解していなくても、文字、単語、または学習アクティビティを追加できるように標準を提供します。

Study ゲートウェイがアダプターを検出する方法 (ゲートウェイのドキュメントに記載)、一般的なセッションまたはクラス管理 (クラス アダプター)、または教師リクエストのワークフローについては責任を負いません。

## 建築

### 言語モジュール契約

すべての言語モジュールは 2 つの名前付き関数をエクスポートします。

```ts
export function createLanguageModule(): LanguageModule | null;
export async function bootstrapLanguageModule(
    ctx: LanguageModuleBootstrapCtx,
): Promise<void>;
```

`createLanguageModule` はアダプター検出中に呼び出されるため、ゲートウェイは完全なブートストラップの前に言語レジストリを迅速に設定できます。 `null` を返して正常にオプトアウトします (たとえば、必要な環境変数が存在しない場合)。

`bootstrapLanguageModule` はブートストラップ フェーズ中に呼び出され、モジュールがルート、子コンポーネント、および静的アセットを登録するコンテキスト オブジェクトを受け取ります。

`LanguageModule` インターフェイス:

```ts
interface LanguageModule {
    readonly languageCode: string; // BCP 47 code, e.g. 'ja', 'ko', 'zh-TW'
    readonly languageName: string; // Human-readable name in the language itself
    readonly languageFlag: string; // Emoji flag, e.g. '🇯🇵'
    readonly version: string; // Semver
    listChildComponents(): LanguageChildComponent[];
}
```

### ライブラリ データ モデル

ライブラリは、言語内のあらゆるものをまとめた権威ある多層レジスタです。レイヤーは下から上に相互に構築されます。

**レイヤー 1 — 文字 (`characters`)**
言語のアトミックな書き込み単位。日本語の場合、これはひらがなとカタカナです。韓国語ならジャモ。漢字などの複合記号 (alt_characters に属するもの) は含まれません。すべてのキャラクターは以下を持ちます:

```ts
interface Character {
    id: string; // Stable unique identifier, e.g. 'ja:char:a'
    symbol: string; // The rendered glyph, e.g. 'あ'
    romanization?: string; // Standard romanization, e.g. 'a'
    category?: string; // Grouping within the script, e.g. 'hiragana', 'katakana'
}
```

**レイヤー 2 — 代替文字 (`alt_characters`)** _(オプション)_
基本文字から派生した複合記号または表語記号。漢字は標準的な例です。各漢字は 1 つ以上の基本文字、または基本文字の組み合わせにマッピングできます。すべての alt_character には次の内容が含まれます。

```ts
interface AltCharacter {
    id: string; // Stable unique identifier, e.g. 'ja:kanji:日'
    symbol: string; // The rendered glyph, e.g. '日'
    components: string[]; // IDs of constituent characters or other alt_characters
    readings?: string[]; // Romanized or phonetic readings, e.g. ['nichi', 'jitsu', 'hi']
}
```

**レイヤー 3 — 定義 (`definitions`)**
意味のフラットストア。定義は、概念を説明する特定の言語 (_定義言語_、通常は学習者の UI 言語) で書かれた短い語句または文です。定義は単語や文に埋め込まれるのではなく、単語や文によって参照されるため、1 つの定義を複数の単語で共有できます。

```ts
interface Definition {
    id: string; // Stable unique identifier
    text: string; // The definition text
    language: string; // BCP 47 code of the definition language, e.g. 'en'
}
```

**レイヤー 4 — 単語 (`words`)**
意味のある単位を形成する 1 つ以上の文字または alt_character の組み合わせ。単語は 1 つ以上の定義にマッピングされ、共通性によってランク付けされるため、控えめな検索によって常に最も一般的な意味が最初に返されます。

```ts
interface Word {
    id: string; // Stable unique identifier, e.g. 'ja:word:nihon'
    graphemes: string[]; // Ordered list of character/alt_character IDs
    definitionIds: string[]; // Ordered by commonality (primary first)
    reading?: string; // Romanized reading of the whole word
    jlptLevel?: string; // Optional proficiency tag, e.g. 'N5'
}
```

**レイヤー 5 — 文 (`sentences`)**
順序付けられた単語のシーケンス。文には、明示的な定義参照 (この文のために書かれた特注の定義) が含まれる場合もあれば、各構成単語の主な定義を連結することによってその意味が継承される場合もあります。

```ts
interface Sentence {
    id: string; // Stable unique identifier
    wordIds: string[]; // Ordered word IDs that form the sentence
    definitionId?: string; // Optional explicit definition; falls back to word definitions
}
```

### 子コンポーネント

子コンポーネントは、特定の言語について独立して提供可能な学習機能です。言語モジュールを介して自身を宣伝するため、UI はサブナビゲーション メニューを構築できます。子コンポーネントは主にライブラリとの間のインターフェースである必要があります。子コンポーネントはライブラリ データを消費し、必要に応じてライブラリ データに書き戻します (例: ユーザーがどの文字を練習したかをクイズで記録します)。

```ts
interface LanguageChildComponent {
    id: string; // Unique within the language, e.g. 'hiragana-alphabet'
    label: string; // Display name shown in the sub-nav, e.g. 'Hiragana Alphabet'
    pageUrl: string; // URL the router navigates to, e.g. '/study/ja/hiragana'
    order?: number; // Lower numbers appear first in the sub-nav menu
}
```

各子コンポーネントは、`bootstrapLanguageModule` 中に `ctx.registerChildRoute` を介して独自のルートを登録します。ルートは HTML ページまたは API エンドポイントを提供します。 UI は、アクティブな言語の登録済み子コンポーネントのリストから、[スタディ] ページの下に `<nav>` を構築します。

### 登録の流れ

```
startup
  └─ Study gateway: discoverLanguageModules(modulesRoot)
       └─ for each language module dir: createLanguageModule() → register in languageRegistry
  └─ Study gateway: bootstrapLanguageModules(modulesRoot, ctx)
       └─ for each module: bootstrapLanguageModule(ctx)
            ├─ ctx.registerChildRoute(path, handler) — registers child page routes
            ├─ ctx.registerStaticDir(prefix, dir)   — serves static assets
            └─ ctx.gateway.registerLanguageModule(module) — adds to runtime registry
  └─ Study gateway exposes:
       GET /api/v1/study/languages/:code/modules → lists child components for that language
```

### ディレクトリ構造

言語モジュールは、モジュール マーケットプレイスを通じてインストールされるスタンドアロン リポジトリです。各リポジトリには次のものが含まれます。

```
cognis-module-japanese-learning/
  package.json          ← version + main field
  index.ts              ← exports createLanguageModule + bootstrapLanguageModule
  data/
    characters/
      hiragana.json     ← Layer 1 character records (one file per character class)
      katakana.json
    alt-characters/
      kanji.json        ← Layer 2 alt-character records (optional)
    definitions/
      common.json       ← Layer 3 definition records
    words/
      common.json       ← Layer 4 word records
    sentences/
      common.json       ← Layer 5 sentence records
  library/              ← TypeScript type documentation for this language's layers
    characters.ts
    alt-characters.ts
    definitions.ts
    words.ts
    sentences.ts
  components/           ← one sub-directory per child component
    hiragana-alphabet/
      ui/
        index.html
        app.js
    library/
      ui/
        index.html
        app.js          ← calls mountStudyLibraryPage from reuse/library-page.js
  docs/
    standard.en.md      ← language-specific contributor guide
```

`data/` ディレクトリは、すべての言語コンテンツの正規のソースです。モジュール所有のライブラリ ストアは、ブートストラップ時にこれらのファイルをロードし、ライブラリ API を通じて公開します。 **言語データは `data/` 以外の場所に保存しないでください。** 子コンポーネント UI ファイルはライブラリ API からデータをフェッチする必要があります。言語データを直接埋め込んではなりません。

子コンポーネント自体に、深くネストされた機能のサブコンポーネントが含まれる場合があります (例: 書き順と語彙のサブセクションが別になっているKanji Explorer)。このようなサブコンポーネントの `pageUrl` には追加のパス セグメントが含まれ、子コンポーネント独自の UI が内部サブナビゲーションを処理します。

## 構成

言語モジュールにはグローバル環境変数がありません。各モジュールの `package.json` には `version` フィールドが含まれます。モジュールのライブラリ データ、API サーフェス、またはコンポーネント リストが変更されるたびに、バンピングが必要になります。

## 拡張ポイント

### 新しい言語を追加する

1. `manifest.json` および `package.json` を使用してスタンドアロン モジュール リポジトリを作成します。
2. マニフェスト ブートストラップ エントリ ポイントから `bootstrapModule(ctx)` をエクスポートします。
3. 言語記述子と子コンポーネントを含む `study:language:<code>` 機能を提供します。
4. 構成された Module Marketplace ソースを通じてリポジトリを公開します。

### 既存の言語に子コンポーネントを追加する

1. 言語モジュール リポジトリに `components/<component-id>/index.ts` を作成します。
2. `ctx.registerChildRoute()` を呼び出し、`LanguageChildComponent` 記述子を返す `registerComponent(ctx)` 関数をエクスポートします。
3. 親言語の `index.ts` で `bootstrapLanguageModule(ctx)` から `registerComponent(ctx)` を呼び出します。
4. `components/<component-id>/ui/` の下に UI ページを追加します。

### 深くネストされたサブコンポーネントの追加

子コンポーネント自体にサブセクション (Kanji Explorer 内の書き順や語彙など) が必要な場合は、子コンポーネント自体の UI 内で内部サブナビゲーションを管理します。 `LanguageChildComponent.pageUrl` はトップレベルのエントリを指します。すべてのサブセクションのルーティングは、そのコンポーネントのページ内でクライアント側で処理されます。

## API ルート

| Method | Path                                    | Description                                          | Auth     |
| ------ | --------------------------------------- | ---------------------------------------------------- | -------- |
| GET    | `/api/v1/study/languages`               | List all available study languages                   | Required |
| GET    | `/api/v1/study/languages/:code/modules` | List child components registered for a language code | Required |

## 図書館と教室の UI 規約

- 現在選択されている学習言語がライブラリの子コンポーネントをネイティブに登録していない場合でも、Study サブナビゲーションには管理者/所有者ユーザー向けの **ライブラリ** エントリが表示される必要があります。
- ライブラリ ページは、ユーザーの現在のサブナビゲーション選択 (`loadStudySubNavigationModel` 経由) からアクティブな言語コンテキストを取得します。ライブラリ ページ自体に別の言語セレクターを追加しないでください。
- ライブラリ データは全体的で言語を認識します。言語は、言語ごとに分割されたハード ルートではなく、レコード フィールド (`language` など) としてモデル化されます。
- すべての言語モジュールは、教師と生徒の両方が言語スコープのクラス ビューにアクセスできるように、**クラスルーム** 子コンポーネント ルートを登録する必要があります。
- 教室ページには、クラスセレクター、座席定員の視覚化、および役割ベースの動作 (教師の管理制御と学生のほとんどの読書 + 退出フロー) が含まれている必要があります。
- 言語モジュールはライブラリおよびクラスルーム UI 実装を所有し、宣言された子コンポーネント ルートを通じてそれらを公開します。
