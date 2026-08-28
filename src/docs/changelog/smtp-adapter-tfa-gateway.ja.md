# TFAゲートウェイおよびSMTP TFAアダプターの修正

**Feature Branch:** copilot/smtp-adapter-tfa-gateway

## 有効化リクエストが失敗しなくなりました。TOTPがデフォルトで有効に。SMTP TFAの状態がSMTP通知に連動

TFAゲートウェイにおいて、アダプターがデータベースに明示的に設定されていない場合でも、有効化リクエストが失敗しなくなりました。TOTPアダプターは外部依存関係がないため、新規インストール時にデフォルトで有効になります。SMTP TFAアダプターの利用可否はSMTP通知アダプターに連動するようになりました。SMTPの送信設定がされていない場合、SMTPによる二要素認証は自動的に利用不可となり、管理画面のトグルはロックされます。TFAアダプターの有効化・無効化を行っても、保存済みの設定が上書きされることはなくなりました。SMTP TFAアダプターのデフォルト確認コード桁数は6桁です。

## Commits

- [93e0a59](https://github.com/Cognis-Labs-HQ/Cognis/commit/93e0a59123d977c14b058e65dab3d9d42ebd011b)
