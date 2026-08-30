# プロバイダー定義の PiP 最小サイズに対応

**機能ブランチ:** feature-honor-minimum-size-in-pip-window

## PiP メタデータの寸法を適用

Focus Control は、プロバイダーが宣言した最小幅と最小高さのメタデータを検証し、その寸法をフローティングウィンドウコントローラーへ渡すようになりました。これにより、サイズ変更した PiP ウィンドウでもプロバイダーが定めた使用可能な最小サイズが維持されます。

## コミット

- [f38004f](https://github.com/Cognis-Labs-HQ/Cognis/commit/f38004f3247f8a9c00277cf0f727615d55d1ccc5)
