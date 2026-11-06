# チュートリアルの対応範囲

以下は、操作可能なダッシュボードページと、各コンポーネントが所有する管理画面の一覧です。コンポーネントが有効で、現在のページや表示中の領域が一致し、アカウントに必要な権限がある場合にだけガイドを利用できます。

## 対応範囲

| ページ・画面                                               | ガイド                     | アクセス           |
| ---------------------------------------------------------- | -------------------------- | ------------------ |
| `/settings` · `#general`                                   | アカウント設定             | ログイン済み利用者 |
| `/settings` · `#appearance`                                | 表示                       | ログイン済み利用者 |
| `/settings` · `#language`                                  | 言語設定                   | ログイン済み利用者 |
| `/settings` · `#datetime`                                  | 日時の設定                 | ログイン済み利用者 |
| `/settings` · `#advanced`                                  | 詳細設定                   | ログイン済み利用者 |
| `/administration` · `#components`                          | コンポーネントの管理       | 管理者             |
| `/administration` · `#status`                              | システムの状態             | 管理者             |
| `/administration` · `#security`                            | セキュリティーポリシー     | 管理者             |
| `/users`                                                   | ユーザー管理               | 管理者             |
| `/administration/modules` · `.module-store-grid`           | モジュール一覧             | 管理者             |
| `^/docs(?:/\|$)`                                           | ドキュメント               | ログイン済み利用者 |
| `^/changelogs(?:/\|$)`                                     | リリース履歴               | ログイン済み利用者 |
| `/dashboard`                                               | ワークスペースと検索の練習 | ログイン済み       |
| `/administration/modules/:uuid` · `.module-detail-release` | モジュールの詳細           | 管理者             |

## コンポーネント別ガイド

機能ごとのページ、対象、アクセス要件は所有するコンポーネントに記載します。任意のコンポーネントからコアのページに翻訳やチュートリアル定義を提供しません。

- [カレンダーの使い方](/docs/gateways/calendar/tutorials)
- [プロフィールと投稿](/docs/adapters/social/profile/tutorials)
- [メッセージの使い方](/docs/adapters/social/messages/tutorials)
- [クラスの使い方](/docs/adapters/study/classes/tutorials)
- [ランキングの見方](/docs/adapters/study/leaderboard/tutorials)
- [フラッシュカードの使い方](/docs/adapters/study/flashcards/tutorials)
- [ライブラリーを探索](/docs/adapters/study/library/tutorials)
- [学習の設定](/docs/gateways/study/tutorials)
- [共有の使い方](/docs/gateways/share/tutorials)
- [招待の使い方](/docs/gateways/registration/tutorials)
- [アカウントの安全設定](/docs/gateways/auth/tutorials)
- [二要素認証](/docs/gateways/tfa/tutorials)
- [通知の設定](/docs/gateways/notify/tutorials)
- [保存容量の上限](/docs/gateways/files/tutorials)
- [ログの確認](/docs/gateways/logging/tutorials)
- [交流機能の管理](/docs/gateways/social/tutorials)

## 外部モジュール

外部モジュールの対象範囲は各リポジトリーの `docs/` でプロバイダーとともに管理します。連携契約は[外部モジュール](/docs/modules/external)を参照してください。

## 対象外となる画面

閲覧専用のライセンス・エラーページ、オフライン起動処理、開発用の画面には操作ガイドを設けません。ログインのコールバック、必須の同意、パスワード確認、必須設定のダイアログは、それぞれの操作規則を維持します。共有先の状態画面から他のアカウントの内容を自動表示しません。埋め込み画面は、そのページコンテキスト内のチュートリアル操作を使います。

## ダッシュボードのパネルと操作

ダッシュボードのガイドは18ステップになり、実際のクリック処理で通知パネルとアカウントメニューを開きます。クリック練習中はホバーを防ぎ、パネルやメニューの説明中は削除やページ移動を行う操作を無効にします。設定、ドキュメント、役割に応じた管理リンク、ログアウトを説明し、ページ操作ドックの言語切り替え、表示、レイアウト編集も案内します。
