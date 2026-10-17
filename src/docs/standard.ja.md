# 開発者向け標準

Cognis のコンポーネントは統一したディレクトリ、公開 ctx 契約、多言語文書を使い、他の実装への結合を避けて拡張できます。

## 使用例

外部モジュールは [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template) から作成します。新しい製品の UUID を割り当て、テンプレートのメタデータを置き換え、開発指針と検証ツールを保持します。Jitsi Meet は以下の構造とライフサイクル契約の参照実装です。

```sh
npm --prefix <module-checkout> test
cognisctl modules:jitsi-meet:ping
```

## 技術仕様

### コンポーネントの所有範囲

コア契約は `src/core/`、ゲートウェイは `src/gateways/<id>/`、アダプターは `src/adapters/<gateway>/<id>/`、外部モジュールは独立リポジトリに配置します。各コンポーネントがサーバーコード、ブラウザー資産、CLI、文書、後始末を所有します。内部インポートに限定し、他のコンポーネントの動作は ctx の機能と段階付きフローを通じて取得します。任意のプロバイダーを削除しても利用側が壊れないようにします。

### 必須のモジュール構造

次のパスは対応機能を提供するときに必須です。未対応機能の空ディレクトリは作成しません。ルートの `manifest.json`、`package.json`、`routes.json`、`bootstrap.js` は必須です。Bootstrap は依存関係を接続し動作を登録します。ドメインハンドラーは検証と調整を行い、ストアと機能が処理を実行します。宣言した `ui/index.html` はページシェルとして使用できます。移動時も既存のルート URL を維持します。

| パス                                              | 責務                 |
| ------------------------------------------------- | -------------------- |
| `api/routes/<domain>/index.js`                    | HTTP                 |
| `api/<feature>/`, `api/reuse/`                    | サーバー             |
| `ui/app/<page>/index.js`, `ui/<feature>/`         | ブラウザー           |
| `ui/styles/`, `ui/styles/reuse/`                  | CSS                  |
| `ui/templates/`                                   | HTML                 |
| `ui/languages/<locale>/strings.xml`               | i18n                 |
| `api/tests/`, `ui/tests/`, `cli/tests/`, `tests/` | テスト               |
| `cli/index.js`                                    | CLI                  |
| `docs/`, `docs/changelog/`                        | Markdown             |
| `data/`, `assets/`, `scripts/`, `tooling/`        | データ、資産、ツール |

### 再利用と検証

`reuse/` は所有する層の複数機能で使う抽象化に限定します。機能コードはその機能の近くに置き、ドメイン内のファイル名は一般名にします。`shared/`、`utils/`、`helpers/`、`common/` は作成しません。宣言間の空行と 1000 行上限を維持します。構造検査は誤ったスタイル配置と平坦なルートファイルを拒否し、公開契約テストで権限、失敗時の復元、再マウント、有効・無効・再有効の周期を検証します。npm スクリプトはチェックアウト単位です。`npm --prefix <module-checkout> test` を使用します。導入済み操作コマンドは `cognisctl modules:<module-id>:<action>` とします。

### 文書契約

統合文書は 30 文字以内の H1 と機能を説明する段落で開始します。最初の H2 に公開契約の使用例を示し、次の H2 から技術仕様を記述します。`.github/DOCUMENTATION_TEMPLATE.<locale>.md` に従います。入力、出力、検証、権限、エラー、状態変更、永続化、安全性、拡張段階、後始末を H3 にまとめます。必須機能、任意依存関係、対応バージョン、失敗動作を明記します。標準文書は現行契約を説明し、リリース履歴は含めません。

### 翻訳と完全性

ドイツ語、英語、インドネシア語、日本語で構造を合わせ、実際に翻訳します。統合概要は `docs/index.<locale>.md`、詳細契約はその隣に配置します。リリース文書は `docs/changelog/`、コアでは `src/docs/changelog/` に置き、PR ごとに四言語一組としコミットリンク間に空行を入れません。リリース文書、シンボリックリンク、エイリアス、マニフェスト自体はハッシュ対象外です。パッケージ、ロックファイル、マニフェスト、検証済み依存上限を同期し、最後の変更後にハッシュを再生成・検証します。
