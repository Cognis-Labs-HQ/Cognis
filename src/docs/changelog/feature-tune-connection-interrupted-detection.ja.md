# 安定した接続復旧

**機能ブランチ:** feature-tune-connection-interrupted-detection

## 接続中断を確認

接続警告を表示する前に同一オリジンのヘルスチェック失敗を確認するため、無関係な API 応答やエラーによる誤検知を防ぎます。復旧状態は Cognis のオリジンごとに分離され、別々の環境が互いに影響しません。

## 復旧後に更新

中断確認後にサービスの復旧を監視し、警告を復旧案内の情報トーストに置き換え、そのトーストの表示時間が終了した時点でページを更新します。トーストを手動で閉じた場合は更新を取り消し、開発者が復旧後のページ状態を調査できるようにします。

## コミット

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)

- [16536120](https://github.com/Cognis-Labs-HQ/Cognis/commit/16536120a1eb3de2bceda8db1a0b19ff73bf4e22)
