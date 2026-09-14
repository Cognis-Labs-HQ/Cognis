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

## 編集保護と再利用可能な折りたたみセクション

変更追跡はブラウザー離脱と SPA ナビゲーションの両方を保護し、古いサブ Composer の監視はアンマウント後に停止します。また、ペイロード駆動の折りたたみセクション Composer が管理画面と外部モジュールで共有できる等幅の操作行を提供します。

## 必須ポップアップと共有ログアウト

ポップアップは閉じるボタン、背景クリック、Escape キーによる終了を無効にする必須操作を選択できるようになりました。ブラウザー ctx は、セッション無効化、キーリングのロック、ローカルアカウント状態の消去、ログイン画面への移動を行う段階的なログアウトフローも提供します。

## 拡張可能なページフッターリンク

ページシェルは `ui:footerLinks` を公開し、スコープ付きリンクをフッターの左側または右側へ追加できるようになりました。ホストもライセンスと変更履歴に同じレジストリを使用します。

## 再利用可能な構造化ページネーション

Keyring のイベント履歴は、呼び出し側が選択するページ件数、構造化されたページ結果、ローカライズ済み操作、データ更新、およびモジュールから利用可能な ctx 機能 `ui:pagination` を備えた共有ページネーターを使用するようになりました。

## 完全なナビゲーションと登録の分離

未保存の編集は戻る・進むの履歴移動でも保護され、移動を拒否すると現在の履歴項目が復元されます。登録フィールドファクトリの失敗は個別に分離され、完了フックには送信値と統合コンテキストが渡され、Keyring は ctx 経由でページネーションを解決します。

## 完全なテストスイートの回帰確認

Keyring とルーターの回帰アサーションを、共通ページネーション制御とインデックス付き SPA 履歴状態に合わせて更新し、完全なテストスイートが再び正常に完了するようにしました。

## 有効なフッターリンクと共通サイドメニュー

フッターリンクが現在のルートとその配下を有効状態として示すようになりました。ドキュメントと変更履歴のナビゲーションは、ctx 機能 `ui:sideMenu` を通じてランタイムモジュールにも公開される、再利用可能な構造化サイドメニュービルダーを使用します。

## アダプター開閉矢印を同じ行に配置

管理画面のアダプター行で、操作コントロールと開閉矢印に別々のサマリー列を確保しました。不要になった矢印幅のコントロール列を削除し、矢印が電源スイッチの直後に同じ行で表示されるようにしました。

## 見出しに揃えるスクロール

サイドメニュー項目で対象見出しを指定できるようになりました。選択時は先頭位置へ滑らかにスクロールし、内容の途中ではなく指定した見出しが上端に表示されます。

## バージョン付き文書の比較

バージョンストアで二つの変更不可能なハッシュを比較し、未変更、追加、変更、削除の各行を順序付きで返せるようになりました。ctx で公開されるブラウザレンダラーが、追加を緑、変更をオレンジ、削除を赤で安全に表示するため、法的文書モジュールは同意を求める前に更新内容を説明できます。

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
- [f7cfe49a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7cfe49a74f4e104348eae5938747f0d601b2b60)
- [7c16485f](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c16485f5abf7b260cf6bf6311dbf80725e4fb05)
- [e240270a](https://github.com/Cognis-Labs-HQ/Cognis/commit/e240270a5a597aeb07cd3e905343be1f2c2ef4f5)
- [c63e7c8f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c63e7c8f0aab5c4e1e38d5963fd64ab7036a40e5)
- [672104a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/672104a008171509ff08eb522d85c90dc70ac045)
- [957a4c49](https://github.com/Cognis-Labs-HQ/Cognis/commit/957a4c4987bbac8d259942e134c33b783e8eb4e5)
- [182a22ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/182a22ef86b98848185f6a73e622bf31845aee2f)
- [5a67fcd2](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a67fcd2562b01e10cf7907158de6d657bd3ec5d)
- [3885aa11](https://github.com/Cognis-Labs-HQ/Cognis/commit/3885aa1123f324422fe756b150957f2a00b6a305)
- [ea7bf233](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea7bf23385e3e32b39f42533c169eb2d483be775)
