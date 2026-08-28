# 安全なリンク表示

**Feature Branch:** feature-add-url-detection-for-markdown-rendering

## HTTP URLをリンク化

Markdownでレンダリングされるユーザーおよび管理者のコンテンツで、プレーンなHTTP/HTTPS URLを安全なハイパーリンクへ自動変換するようになりました。

## 非HTTPリンクはテキストのまま

リンクとしてレンダリングされる宛先はHTTPとHTTPSのみに限定され、メールやアプリ固有のURLスキームが生成コンテンツ内でクリック可能になることを防ぎます。

## Commits

- [b69825f](https://github.com/Cognis-Labs-HQ/Cognis/commit/b69825ff2436e850fe55db64531d012ddda87b20)
