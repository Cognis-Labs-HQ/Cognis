# モジュール設定の公開チュートリアル対象

**機能ブランチ:** feature-module-config-tutorial-targets

## モジュール設定の公開チュートリアル対象

公開機能 ui:moduleTutorialTargets は card(id) に加え settings(id)、field(id,key)、action(id,key)、preview(id) を提供し、呼び出し元のシグナルに紐付けます。設定ハンドルはチュートリアルのモーダル認可用セレクターを返します。bindSettings(id,{signal}) は準備中と表示中のエディターを分岐に紐付け、所有エディターが settingsSignal(id) を使います。アダプターの入口は adapterSettings(gateway,id) と revealAdapter(gateway,id) を使います。対象を解決するのは所有者だけで、閉じかけの画面や別モジュールのポップアップは対象を提供しません。

## 公開ポップアップ契約を使う

設定の中止には onOpen で渡される保護付き終了コールバックを使います。requestClose は onAction 専用であり、テストもこの違いを再現します。共通・独自のアダプターエディターは、注入されたポップアップラッパーからゲートウェイとアダプターの識別情報を公開し、adapterSettings() のセレクターと一致させます。入れ子の確認ダイアログは自身の識別情報を維持します。

## コミット

- [ad94587](https://github.com/Cognis-Labs-HQ/Cognis/commit/ad945875c919d504058437aab92449d254d79aa8)
- [40d61ed](https://github.com/Cognis-Labs-HQ/Cognis/commit/40d61eded176b472f7040dbfcdb34d7d0067107d)
