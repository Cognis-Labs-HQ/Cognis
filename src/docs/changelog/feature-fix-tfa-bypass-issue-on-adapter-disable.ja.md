# TFAアダプター無効化時のログイン回避

**Feature Branch:** feature-fix-tfa-bypass-issue-on-adapter-disable

## 無効化されたTFAアダプターでログインをブロックしない

管理者がユーザー設定済みのTFAアダプターを無効化した場合、ログインはその方式を強制対象として利用不可と扱い、TFAをスキップして、一時的に利用できないというエラーを返さないようになりました。

## Commits

- [5b67ac9](https://github.com/Cognis-Labs-HQ/Cognis/commit/5b67ac95fe2b594f8b76c38d73dfdf5adf945dbf)
