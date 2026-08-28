# 終日カレンダーICS

**Feature Branch:** feature-fix-all-day-events-display-format

## 真の終日エクスポート

カレンダーフィードは、ブラウザーが UTC オフセット付きのローカル深夜範囲として保存した場合でも、終日イベントを ICS の日付値としてエクスポートするようになりました。これにより、カレンダークライアントでは 00:00〜24:00 の時間枠ではなく、終日イベントとして表示されます。

## Commits

- [a0f2dd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/a0f2dd5c85307e0ccd39fa03cd3e53c31a610ece)
