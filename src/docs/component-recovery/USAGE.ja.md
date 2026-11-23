# 使用例

コンポーネントの復旧 の実践的な操作手順です。

## 前提条件

コード変更前に管理者権限とバックアップを用意します。

## 使用例

`cognisctl component:list` と component:info で問題を調べ、依存先や設定を修正してから再試行します。

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## 期待される結果

成功すると自身の登録が復元し、要件が満たされない間は依存する機能を利用できません。

## 問題の解決

強制操作は影響を確認して使います。利用不能な機能の境界を回避してはいけません。
