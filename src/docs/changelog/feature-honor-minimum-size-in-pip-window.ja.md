# プロバイダー定義の PiP 最小サイズに対応

**機能ブランチ:** feature-honor-minimum-size-in-pip-window

## PiP メタデータの寸法を適用

Focus Control は、プロバイダーが宣言した最小幅と最小高さのメタデータを検証し、その寸法をフローティングウィンドウコントローラーへ渡すようになりました。これにより、サイズ変更した PiP ウィンドウでもプロバイダーが定めた使用可能な最小サイズが維持されます。

## 開いている PiP の最小サイズを更新

PiP コンシューマーは、クリーンアップ関数を通じてフローティングウィンドウの最小寸法を更新できるようになりました。開いているウィンドウが新しい有効な最小サイズより小さい場合、Cognis は利用可能な境界内で直ちに拡大して位置を調整します。

## コミット

- [f38004f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38004f3247f8a9c00277cf0f727615d55d1ccc5)
- [1d32579](https://github.com/Cognis-Labs-HQ/Cognis/commit/1d3257996e889a1a23fd7ebd316a0c280b7ebee3)
- [094c44d](https://github.com/Cognis-Labs-HQ/Cognis/commit/094c44dbc1be75bd716e3522942f694315a90722)
