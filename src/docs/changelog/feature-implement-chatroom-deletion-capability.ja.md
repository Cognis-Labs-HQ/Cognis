# 安全なチャットルーム整理

**機能ブランチ:** feature/implement-chatroom-deletion-capability

## 認可されたチャットルーム削除

ルーム所有者または唯一残った参加者が要求した場合に、チャットルームと依存レコードを完全に削除するMessages機能を公開しました。

## 正しいユーザー検索絞り込み

単数形のユーザー結果フィルターを正規化し、登録済み結果とグループ化された結果にも適用しました。これにより、モジュールの検索ダイアログには無関係なローカルまたはAPIカテゴリーを除いたユーザーだけが表示されます。

## テーマ対応の検索操作

検索ポップアップの文字による閉じる操作とブラウザー標準の入力消去操作を、ライト・ダークテーマ用の統一されたSVGアイコンに置き換えました。入力欄の消去アイコンは小さく半透明にし、複数選択のチェックボックスは利用者情報の上ではなく横に配置しました。

## コミット

- [9f64c81](https://github.com/Cognis-Labs-HQ/Cognis/commit/9f64c81c94c94b711dc991451ed8d5a90ed1a189)
- [21df334](https://github.com/Cognis-Labs-HQ/Cognis/commit/21df334147bba7036d9b2fa7f3fa41585b928a89)
- [7af4f58](https://github.com/Cognis-Labs-HQ/Cognis/commit/7af4f5826c790f1fe7e04667f6069ca3798e052b)
- [e2649b74](https://github.com/Cognis-Labs-HQ/Cognis/commit/e2649b74f2afb12cddf88dcb4e2c64ea7403648e)
