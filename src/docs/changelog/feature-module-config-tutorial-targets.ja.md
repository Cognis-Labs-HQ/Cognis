# モジュール設定の公開チュートリアル対象

**機能ブランチ:** feature-module-config-tutorial-targets

## モジュール設定の公開チュートリアル対象

公開機能 ui:moduleTutorialTargets は card(id) に加え settings(id)、field(id,key)、action(id,key)、preview(id) を提供し、呼び出し元のシグナルに紐付けます。設定ハンドルはチュートリアルのモーダル認可用セレクターを返します。bindSettings(id,{signal}) は準備中と表示中のエディターを分岐に紐付け、所有エディターが settingsSignal(id) を使います。アダプターの入口は adapterSettings(gateway,id) と revealAdapter(gateway,id) を使います。対象を解決するのは所有者だけで、閉じかけの画面や別モジュールのポップアップは対象を提供しません。

## 公開ポップアップ契約を使う

設定の中止には onOpen で渡される保護付き終了コールバックを使います。requestClose は onAction 専用であり、テストもこの違いを再現します。共通・独自のアダプターエディターは、注入されたポップアップラッパーからゲートウェイとアダプターの識別情報を公開し、adapterSettings() のセレクターと一致させます。入れ子の確認ダイアログは自身の識別情報を維持します。

## 対象の接続前からアダプターエディターを紐付ける

注入されたアダプターポップアップラッパーは、画面を開き始めた時点からチュートリアルのシグナルを所有します。後続の対象がまだ接続されていない場合や、独自エディター自身がシグナルを使わない場合でも、中止時に保護付き終了を要求します。準備中の中止は onOpen で再確認し、エディター終了時にリスナーを解除します。

## 有効化中も設定の所有関係を維持

モジュール設定では、無効なモジュールを一時的に有効化する前にチュートリアルの分岐を取得し、同じシグナルを設定の準備に渡します。有効化中に中止すると、後からエディターが開くことを防ぎ、無効な状態に戻します。カスタムアダプターのエディターで保護された終了を拒否した場合、その後のページ変更でも初期化を通常どおり実行し、中止要求を繰り返しません。

## コミット

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
- [40d61ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d61eded176b472f7040dbfcdb34d7d0067107d)
- [f9fc6e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9fc6e2b8ac572bd04bd68a3d9e1fc7fc0e34fd7)
- [d5936c9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5936c995750fa83f4ea3fb15a7ee43ccc0df342)
