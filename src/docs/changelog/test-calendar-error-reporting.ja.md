# カレンダーのエラー報告

**機能ブランチ:** test-calendar-error-reporting

## カレンダー操作の重複を防止

カレンダー表示のリスナーを描画単位で管理します。サイズ変更や再描画で以前のリスナーを置き換え、一度のクリックで一つのフォームを開きます。画面移動時にはこれらを解除し、無関係なリスナーと異なるエラーの表示は維持します。

## オフラインカレンダーを維持

最新の開発ブランチにリベースし、カレンダーのオフラインクライアント、変更の送信待ち、保存済みの予定詳細、リマインダー操作を維持しました。描画単位のスコープはビューのリスナーのみを置き換え、画面移動後も予定を選択できます。

## コミット

- [aa2959b21e70c585bf864c639f5319fdbb48f10a](https://github.com/Cognis-Labs-HQ/Cognis/commit/aa2959b21e70c585bf864c639f5319fdbb48f10a)
- [ee6db7013d3b8b614bef1766a8e05c0572ac4932](https://github.com/Cognis-Labs-HQ/Cognis/commit/ee6db7013d3b8b614bef1766a8e05c0572ac4932)
- [3f6fb44800349314679b0fcd2bc827b9681a7bd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f6fb44800349314679b0fcd2bc827b9681a7bd5)
- [c907d3dda0d8b07b8c9f0c6580ce4afb517315b2](https://github.com/Cognis-Labs-HQ/Cognis/commit/c907d3dda0d8b07b8c9f0c6580ce4afb517315b2)
- [9ee6d1d058d11f1a4dfd849183aebda17a804aa7](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ee6d1d058d11f1a4dfd849183aebda17a804aa7)
