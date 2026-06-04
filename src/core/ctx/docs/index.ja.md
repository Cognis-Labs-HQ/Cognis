# Core Ctx と Flow バス

## 概要

`src/core/ctx/` は、プラットフォーム全体で使う `ctx` ケーパビリティバスを core の独立した面として定義します。設計は非前提です。各コンポーネントは他コンポーネントの内部実装を直接 import せず、ケーパビリティ提供・flow 登録・stage hook 注入を行います。

同一の ctx インスタンスを core、gateway、adapter、module、route bootstrap で共有する想定です。これにより機能合成は明示的かつ可逆になります。コンポーネント無効化時には、その flow hook と capability だけを外せます。

flow モデルは処理を名前付きライフサイクルとして扱い、各 stage を決定的順序で実行します。flow はバックエンド処理（ユーザー追加、パスワード変更）、メッセージ処理（送信、ミーティング作成）、UI 構築（設定ページ、ログインページ）を表現できます。

## 責務

- capability の提供と参照の単一サーフェスを提供する。
- 順序付き stage 定義を持つ名前付き flow を登録する。
- コンポーネントによる stage hook の注入/解除を可能にする。
- 安定した順序で stage ごとに flow を実行する。
- 観測性とテストのために stage 実行結果を返す。

責務外: 永続化、HTTP ルート配線、adapter 発見、コンポーネント有効/無効の方針決定。

## アーキテクチャ

### 主要ソース位置

| パス                                  | 目的                                                    |
| ------------------------------------- | ------------------------------------------------------- |
| `src/core/ctx/create-ctx.ts`          | 関数分割されたモジュールから ctx インスタンスを構築する |
| `src/core/ctx/types.ts`               | capability、flow、hook、実行結果の公開契約              |
| `src/core/ctx/register-flow.ts`       | flow 登録と stage 検証                                  |
| `src/core/ctx/add-flow-stage-hook.ts` | コンポーネント注入用の stage hook 登録                  |
| `src/core/ctx/run-flow.ts`            | 順序付き stage 実行ランタイム                           |

flow は明示的な stage ID で一度登録します。各 stage hook は `order` 値付きで追加されます。実行時は `order` 昇順、同値時は hook ID 順で処理され、決定的動作を保証します。

flow は `context.ctx.runFlow(...)` で別 flow を呼び出せます。例: ログイン UI 構築 flow がログイン flow を呼び、ログイン flow が LDAP 条件成立時に LDAP flow を呼びます。

## 設定

このコンポーネントにランタイム環境変数設定はありません。

## 拡張ポイント

- `ctx.contributeCapability(key, value)` でクロスコンポーネント capability を提供する。
- `ctx.registerFlow({ id, stages })` で新しいオーケストレーション pipeline を登録する。
- `ctx.addFlowStageHook(flowId, stageId, hook, handler)` で flow 振る舞いを注入する。
- 無効化時は `ctx.removeFlowStageHook(...)` と `ctx.unregisterFlow(...)` で振る舞いを解除する。

## API ルート

このコンポーネントは HTTP ルートを直接登録しません。
