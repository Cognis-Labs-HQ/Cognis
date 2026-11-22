# 認証情報の翻訳更新

**機能ブランチ:** feature-module-credential-translation

## 利用前に翻訳カタログを更新

変更可能な言語 URL のホスト翻訳カタログは、共通のネットワーク更新を待ってから表示に使用します。ネットワーク障害または既存の4秒のタイムアウト時には、利用可能なキャッシュを保持します。コンテンツハッシュ付きカタログは引き続きキャッシュを優先し、他の公開アセットの更新方針は変わりません。

## 認証情報の案内を各言語で保持

モジュールソースのフォームは、既存の英語・ドイツ語・インドネシア語・日本語の認証情報案内を保持します。優先言語に値がない場合は英語を使用し、英語にもない場合は明示的に失敗します。回帰テストでは編集画面の遷移、繰り返しの表示、保存済み認証情報、キャッシュの復旧を検証します。

## コミット

- [018fd0697080bf608bb962e4ad39d659afecbc63](https://github.com/Cognis-Labs-HQ/Cognis/commit/018fd0697080bf608bb962e4ad39d659afecbc63)
- [2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a)
- [35fbcec366050e04893571c865adbd94d9496f0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/35fbcec366050e04893571c865adbd94d9496f0b)
