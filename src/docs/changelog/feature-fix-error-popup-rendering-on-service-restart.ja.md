# サービス中断中も確実に表示されるエラーポップアップ

**Feature Branch:** feature-fix-error-popup-rendering-on-service-restart

## Cognis の再起動中もエラーポップアップを読みやすく表示

Cognis は、サービスが応答している間に完全なポップアップ用スタイルシートをブラウザーの一時的な Cache Storage に保存するようになりました。再起動中にサーバーが一時的に応答しなくても、実行時エラーダイアログは保存済みのスタイルシートを使用し、スタイルのないページ内容として表示されません。

## Commits

- [dc87c30](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc87c30f1621b82081ff176cf15f2df337df3f14)
