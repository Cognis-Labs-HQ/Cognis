# 登録インテグレーション

**機能ブランチ:** feature-add-support-for-pr-1-changes

## バージョン付き文書保存

Core は、独立して配布されるモジュール向けに、中立的で追記専用のデータベース対応文書バージョンストアを公開するようになりました。既存のドキュメントと変更履歴のアーカイブは、多言語かつコンポーネントバージョン単位のファイルシステムスナップショットを維持します。これらの静的ソースをデータベースレコードへ変換しても、バージョンモデルを改善せず保存を重複させるためです。

## 登録拡張

ホスト所有の登録フローは、モジュールのフィールドを構成して値を検証し、移動前に認証済み登録処理を完了するようになりました。

## モジュール画像の代替表示

壊れている、または無効なモジュールアイコンとバナーは、実行時エラーのポップアップを開かずに標準の不明モジュール画像へ切り替わるようになりました。

## ホストナビゲーション Capability

モジュールのライフサイクルはアプリルーターを `ui:navigate` の提供元として認識し、ホストナビゲーションを必要とするモジュールを有効化できるようになりました。

## 安全なコントリビューション読込

管理画面は SPA ガード下で提供された UI モジュールを読み込み、ページエントリーポイントが管理画面の URL に対して自己マウントすることを防ぐようになりました。

## 堅牢な画像フォールバック

モジュール画像は標準の公開フォールバックアセット経路を使用し、フォールバックも読み込めない場合は実行時エラーのポップアップを開かず非表示にするようになりました。

## 信頼性の高い登録構成

登録フローは ctx のキャメルケース命名規則に従い、壊れた統合フックを分離して基本登録を利用可能なまま保ち、コントリビューター向けに信頼済み HTML ラベルを文書化するようになりました。

## コミット

- [2f77a92](https://github.com/Cognis-Labs-HQ/Cognis/commit/2f77a92c78df6da12b4c000b47b2c787ab517695)
- [8b480faf](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b480fafbceca1dd52b9c693dc1f0d4381d473b8)
- [84f84a43](https://github.com/Cognis-Labs-HQ/Cognis/commit/84f84a43659185eb65e48004cc9a898b69aa4458)
- [2ad50da](https://github.com/Cognis-Labs-HQ/Cognis/commit/2ad50dacc8f0a73aa965b85410054a881a05cd17)
- [1b13f90](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b13f90326737588d470ac1e4919e36ed9fba4dd)
- [082e5f2](https://github.com/Cognis-Labs-HQ/Cognis/commit/082e5f2ab7fc36c948c2da97539d1b56cd7fdae0)
- [2be280e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2be280efacce0abf81d80ad3aae9bd23c8db921a)
- [fb19c34e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fb19c34e1ad6b7de4b7c0dd2c6bb8e0fad171484)
- [3f80ad56](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f80ad56eb500d81031d7c3001bc1b5c246f84a1)
- [8f67ef9e](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f67ef9eb42910f9597f694d2d7b819b1ab00940)
