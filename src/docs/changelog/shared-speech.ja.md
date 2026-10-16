# 共通音声機能の統合

**機能ブランチ:** feature-update-external-package-contract-definitions

## 使用方法

ElevenLabs合成を設定可能な独立モジュールへ移します。Studyは保存済みグローバルカードに言語ごとの任意の声を使用し、個人・クラスカードは上限付きアップロードとマイク録音を受け付けます。既存の構成カード音声を連続結合する代替機能を維持し、管理者は編集時にグローバル音声を再生成できます。

## Study有効化の修正

同梱音声の削除時に英語と日本語の実際のコンテンツパックのバージョンを上げます。有効化の失敗を返す前に他のモジュールの再構築を完了し、同意ルートの登録済みフローを維持します。

## 特権なしで音声機能を公開

モジュール自身の名前空間で `elevenlabs-tts:synthesis` を公開し、特権フラグを削除します。英語・日本語Studyは既存の任意依存関係を利用し、ctx経由で機能を解決します。Studyの橋渡し処理は呼び出し側から現在の機能を取得する関数を受け取り、無効化・再有効化と設定済み音声に対応します。

## コミット

- [2bebe47](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bebe47baf20112a4c84cff2bb65ce270c6b52eb)
- [7c495dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c495dcda4c67bdff3c385670465baee4763b046)
