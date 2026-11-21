# プロフィールのイニシャル統一

**機能ブランチ:** feature-profile-initials-integrated

## アバター表示を共通化

ナビゲーション、プレビュー、Profile 上部は Profile が管理するイニシャル、色、明示的なサイズの規則を共有します。維持された画像でエラーが発生した場合も、最新の認可済みの名前のイニシャルを表示します。プレビューのアバターはプレビューを再開せず対象のプロフィールへリンクします。

## 対応するアセットを更新

Profile 4.0.0 には対応するシェルのナビゲーション用契約が必要です。両方を同時に配布してください。提供側が同期的に内容を作り、シェルは既存のボタン、メニュー、在席表示を維持します。既存の独自アバター設定は継続利用できます。Messages と Calendar の検証済み上限は 4.0.0 に更新します。外部モジュールの互換性と実ブラウザーのレイアウトは未検証です。

## コミット

- [ada7d770c1e5dd54ba303ab52df127bff327a285](https://github.com/Cognis-Labs-HQ/Cognis/commit/ada7d770c1e5dd54ba303ab52df127bff327a285)
- [185f85f89a8962d4762ae862cc3aec124bad4718](https://github.com/Cognis-Labs-HQ/Cognis/commit/185f85f89a8962d4762ae862cc3aec124bad4718)
