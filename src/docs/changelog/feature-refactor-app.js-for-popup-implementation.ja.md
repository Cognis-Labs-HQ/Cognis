# 拡張可能なライブラリエントリポップアップ

**機能ブランチ:** feature-refactor-app.js-for-popup-implementation

## ルート連動のエントリ詳細

ライブラリエントリは、利用可能なメタデータ、関連情報、前後ナビゲーションを備え、履歴と連動する簡潔なポップアップで開きます。Study ナビゲーションにはユーザーメニューと同じボタンスタイルを適用します。

## 拡張可能な詳細構成

詳細フローを UI プロバイダーの読み込み前に宣言し、コア前、コア、コア後の順序、削除可能なフック、提供されたポップアップアクションの実行を保証します。

## 信頼性の高いページライフサイクル

直接読み込みと SPA 遷移は標準の認証済みページコンポーザーライフサイクルを使用し、Study サブメニューを一行かつ一貫したサイズで維持します。正規エントリリンクは共有可能で、中止されたマウントによる古いポップアップを防ぎ、閉じる操作も正常に機能します。 Study URL から `language` クエリパラメーターを削除し、選択中の言語ボタンが ISO コードを保持して移動時の選択に使用されます。

## Study 所有の言語ナビゲーション

Study の言語ボタン移動を独自の UI ケイパビリティバインディングで処理し、コアアプリルーターを Study 状態に結合しないようにしました。直接エントリルートは描画前にスキーマ言語を解決し、直接読み込まれた一覧でも戻る操作が正しく機能します。

## コミット

- [f25e2f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f25e2f649aadef46a713e85d70d627370f60ba5c)
- [160cbba5](https://github.com/Cognis-Labs-HQ/Cognis/commit/160cbba5e9344f11c429f4c8f8ae2ba4ceda468b)
- [a6b4a095](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6b4a09575d55c2d74e28d58a85beecd832e8c6c)
- [fc4bd3f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc4bd3f53c620345d597e94cdfd5f8b611b5c02c)
- [e0e89430](https://github.com/Cognis-Labs-HQ/Cognis/commit/e0e894300370247239ce4b1811a56336db0b3e1c)
- [13886e88](https://github.com/Cognis-Labs-HQ/Cognis/commit/13886e885724482b15279da0c5f0e949ab16fdc9)
