# 技術リファレンス

この一覧は、導入された機能と、そのインターフェースおよびアクセス規則を所有するコンポーネントを対応付けます。

## インターフェース

[Study](/docs/gateways/study/technical) は言語提供者、[Library](/docs/adapters/study/library/technical) は内容と取り込み、[Flashcards](/docs/adapters/study/flashcards/technical) はデッキと練習を担当します。[Calendar](/docs/gateways/calendar/technical) は予定、[Messages](/docs/adapters/social/messages/technical) は会話、[Share](/docs/gateways/share/technical) は委譲リンクと受信者を所有します。

## 設定

管理者は有効なコンポーネントと提供者設定を選び、各アカウントは学習言語と設定を選びます。メール配信には設定済みの送信者と適切なアカウント規則が必要です。SMTP スキーマや導入済み SSO アダプターだけでは、動作する外部接続を確立しません。

## 動作

移動先と学習活動は有効な登録とアカウント権限で決まります。機能の文書は導入済み機能の一覧ではありません。[UI](/docs/ui/technical) はルーティング、オフラインアセット、アカウントに属するオフライン動作を定義し、各ドメインがキューに保存できる操作と接続必須の操作を定義します。

## セキュリティ

可視性、クラス所属、所有権、モデレーション、委譲権限は別々に検証します。ロール別の操作表示はバックエンドを認可しません。言語データや共有リンクから、担当ドメインの規則を迂回してはいけません。

## リファレンス

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/calendar/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/calendar/bootstrap/index.ts)
- [src/gateways/share/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/share/bootstrap/index.ts)
