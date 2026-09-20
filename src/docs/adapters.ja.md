# アダプター

## 概要

`src/adapters/` はゲートウェイインターフェースのすべてのプロバイダー固有の実装を含みます。アダプターは `src/core/` またはゲートウェイで定義されたコントラクトを実装する具体的なクラスです。データベースバックエンドの交換は環境の `DB_TYPE` を変更するだけで済みます。ゲートウェイ外のアプリケーションコードは変更されません。

各アダプターは `src/adapters/<gateway-id>/<adapter-id>/` の下に配置され、独自の `package.json`、テスト、ドキュメントを持ちます。

## 責務

- 特定の外部プロバイダー向けのゲートウェイインターフェースを実装する。
- プロバイダー固有の接続詳細、SQLダイアレクト、エラー処理を内部で管理する。
- 独自のスキーマ初期化SQLを持つ（DBアダプターの場合）。
- 独自のテスト、ドキュメント、バージョンマニフェストを持つ。

## アーキテクチャ

```
src/adapters/
  db/
    mariadb/     — MariaDB/MySQL
    postgres/    — PostgreSQL（デフォルト）
    memory/      — インメモリ（テストのみ）
  auth/
    local/       — scryptハッシュのローカル認証情報
    ldap/        — LDAPディレクトリ認証
    saml/        — SAML 2.0 SSO
    oidc/        — OAuth2/OIDC SSO
  notify/
    smtp/        — SMTPによるメール配信
  file/
    local/       — ファイルシステムベースのファイルストレージ
```

## ファイル構造の規約

`package.json` の `main` フィールドは常に `index.ts` を指さなければならない — これがアダプターのオーケストレータエントリーポイントであり、ゲートウェイが動的にインポートするファイルである：

```json
{
    "name": "@cognis/adapter-notify-smtp",
    "version": "0.2.1",
    "private": true,
    "type": "module",
    "main": "index.ts"
}
```

`index.ts` はアダプターのパブリック表面であり、外部呼び出し元が必要とするすべてのものをエクスポートする。内部実装ファイルは `index.ts` の兄弟として配置され、アダプターの外部から直接インポートされることはない。

## 拡張ポイント

既存のゲートウェイに新しいアダプターを追加するには、`src/adapters/<gateway-id>/<adapter-id>/` の下にディレクトリを作成し、以下を含めます:

- アダプター実装（ゲートウェイインターフェースを実装するTypeScriptクラス）
- `name`、`version`、`main` フィールドを含む `package.json`
- エクスポートされた `createAdapter()` 関数
- ドキュメント標準に従った `docs/index.en.md`
- `tests/` 以下のテスト
