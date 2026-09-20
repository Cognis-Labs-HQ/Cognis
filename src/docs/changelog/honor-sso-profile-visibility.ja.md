# SSO プロフィール公開範囲

**機能ブランチ:** honor-sso-profile-visibility

## プロバイダー指定の公開範囲

外部認証セッションと解決済み外部プロフィールが `profileVisibility` を返せるようになりました。Cognis は対応する値を検証し、常に既定値を維持するのではなく、プロフィールの作成または同期後に指定された公開範囲を保存します。

## コミット

- [b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
