# チュートリアルの対応範囲

以下は、操作可能なダッシュボードページと、各コンポーネントが所有する管理画面の一覧です。コンポーネントが有効で、現在のページや表示中の領域が一致し、アカウントに必要な権限がある場合にだけガイドを利用できます。

## 対応範囲

| ページ・画面                                     | ガイド                   | アクセス           |
| ------------------------------------------------ | ------------------------ | ------------------ |
| `/settings` · `#general`                         | アカウント設定           | ログイン済み利用者 |
| `/settings` · `#appearance`                      | 表示                     | ログイン済み利用者 |
| `/settings` · `#language`                        | 言語設定                 | ログイン済み利用者 |
| `/settings` · `#datetime`                        | 日時の設定               | ログイン済み利用者 |
| `/settings` · `#advanced`                        | 詳細設定                 | ログイン済み利用者 |
| `/administration` · `#components`                | コンポーネントの管理     | 管理者             |
| `/administration` · `#status`                    | システムの状態           | 管理者             |
| `/administration` · `#security`                  | セキュリティーポリシー   | 管理者             |
| `/users`                                         | ユーザー管理             | 管理者             |
| `/administration/modules` · `.module-store-grid` | モジュール一覧           | 管理者             |
| `^/docs(?:/\|$)`                                 | ドキュメント             | ログイン済み利用者 |
| `^/changelogs(?:/\|$)`                           | リリース履歴             | ログイン済み利用者 |
| `/calendar`                                      | カレンダーの使い方       | ログイン済み利用者 |
| `^/profile(?:/\|$)`                              | プロフィールと投稿       | ログイン済み利用者 |
| `^/messages(?:/\|$)`                             | メッセージの使い方       | ログイン済み利用者 |
| `/classes` · `#class-list`                       | クラスの使い方           | ログイン済み利用者 |
| `/my-classes`                                    | 参加しているクラス       | ログイン済み利用者 |
| `^/study/leaderboard(?:/\|$)`                    | ランキングの見方         | ログイン済み利用者 |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`        | フラッシュカードの使い方 | ログイン済み利用者 |
| `^/study/explore(?:/\|$)`                        | ライブラリーを探索       | ログイン済み利用者 |
| `^/study/library/search(?:/\|$)`                 | 辞書の検索               | ログイン済み利用者 |
| `^/study/(?:library/)?requests(?:/\|$)`          | ライブラリーへの申請     | ログイン済み利用者 |
| `^/study/library(?:/\|$)` · `.library-browser`   | ライブラリーの管理       | 管理者             |
| `^/study/(?:settings\|welcome)$`                 | 学習の設定               | ログイン済み利用者 |
| `/shares`                                        | 共有の使い方             | ログイン済み利用者 |
| `/invite`                                        | 招待の使い方             | ログイン済み利用者 |
| `/settings` · `#auth-security-reset-panel`       | アカウントの安全設定     | ログイン済み利用者 |
| `/settings` · `#tfa-settings-panel`              | 二要素認証               | ログイン済み利用者 |
| `/administration` · `#tfa-enforcement`           | 二要素認証の必須設定     | 管理者             |
| `/settings` · `#notif-matrix-container`          | 通知の設定               | ログイン済み利用者 |
| `/administration` · `#notifications`             | 通知の配信               | 管理者             |
| `/administration` · `#broadcasts`                | お知らせの管理           | 管理者             |
| `/administration` · `[data-files-quota-admin]`   | 保存容量の上限           | 管理者             |
| `/administration` · `#logs`                      | ログの確認               | 管理者             |
| `/administration` · `#registration`              | 登録の方針               | 管理者             |
| `/administration` · `#social`                    | 交流機能の管理           | 管理者             |

## 外部モジュール

連携する各モジュールは、Analytics、ElevenLabs、英語と日本語の学習、Jitsi の会議と管理、3 種類の法的文書、X と LINE のログイン設定、Whiteboard のキャンバス・設定・管理に対応します。ガイドは各リポジトリーで所有し、配布します。

## 対象外となる画面

閲覧専用のライセンス・エラーページ、オフライン起動処理、開発用の画面には操作ガイドを設けません。ログインのコールバック、必須の同意、パスワード確認、必須設定のダイアログは、それぞれの操作規則を維持します。共有先の状態画面から他のアカウントの内容を自動表示しません。埋め込み画面は、そのページコンテキスト内のチュートリアル操作を使います。
