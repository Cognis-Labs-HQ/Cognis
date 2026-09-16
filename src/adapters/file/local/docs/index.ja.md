# ローカルファイルストレージアダプター

## 概要

ローカルファイルアダプターは、アップロードされたファイルをサーバーのローカルファイルシステムに保存します。これは現在のプラットフォームで唯一のファイルストレージアダプターで、マニフェストには `"locked": true` があり、アダプターUIから無効化または置き換えができません。将来のクラウドストレージアダプター（S3、GCS、Azure Blob）はこのアダプターのドロップイン置き換えになります。

このアダプターは名前空間ベースです。すべての操作はまず `namespaceId` を受け取り、物理ストレージは `{storageRoot}/{namespaceId}/...` にルート化されるため、異なる名前空間のファイルがディスク上で衝突することはありません。

## 責務

- 名前空間ベースの `FileStorageGateway` インターフェースを実装する: `put`、`store`、`get`、`delete`、`list`（それぞれ名前空間を先頭に取る）。
- アップロードされた各ファイルのMIMEタイプから安定したファイル拡張子を導出する。
- `store()` で保存されるファイルにUUIDベースのファイル名を生成する。
- 保存されたファイルを `{namespaceId}/{actorId}/{uuid}.{ext}` キーにスコープする。

- ローカルファイルシステム上の `$MEDIA_LOCATION/uploads` からファイルを提供する。

責務外: HTTPでのファイル配信（Filesゲートウェイのルートが担当）、ACLやクォータの強制（Filesゲートウェイの `NamespaceFileService` がアダプター呼び出し前に検査）。

### 名前空間とキーの分離

`store(namespaceId, actorId, content, contentType)` は `uuid` を生成して `{namespaceId}/{actorId}/{uuid}.{ext}` に書き込みます。`put(namespaceId, key, content, contentType)` は `${storageRoot}/${namespaceId}/${key}` に書き込み、中間ディレクトリを作成します。プライベートな `namespaceRoot(namespaceId)` ヘルパーが各メソッドで使う名前空間ごとのルートを解決します。

## アーキテクチャ

### MIMEから拡張子へのマッピング

| MIMEタイプ   | 拡張子 |
| ------------ | ------ |
| `image/jpeg` | `jpg`  |
| `image/png`  | `png`  |
| `image/webp` | `webp` |
| `image/gif`  | `gif`  |

このマッピングにないMIMEタイプのファイルは `.bin` 拡張子で保存されます。

## 設定

| 変数             | デフォルト   | 説明                                                                          |
| ---------------- | ------------ | ----------------------------------------------------------------------------- |
| `MEDIA_LOCATION` | `/app/media` | メディアのルートディレクトリ; アップロードは `$MEDIA_LOCATION/uploads` に保存 |
