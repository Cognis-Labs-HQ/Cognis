# Penegakan Hak Berbagi

**Cabang Fitur:** feature-share-grant-enforcement

## Periksa kedaluwarsa saat akses

Berbagi langsung kepada pengguna tidak lagi memberi akses setelah kedaluwarsa, termasuk berbagi yang telah dibuka dengan kata sandi dan disimpan dalam riwayat. Nilai kedaluwarsa kosong tetap tanpa batas; nilai tidak kosong yang tidak valid menolak akses.

## Hormati pencabutan hak eksplisit

PATCH dengan `grantedCapabilities: []` menghapus semua kapabilitas yang diberikan. Tanpa bidang tersebut, hak tetap dipertahankan; larik tidak kosong menggantikannya. Pemeriksaan penerima, kata sandi, dan adaptor tetap berlaku.

## Komit

- [37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359630d1cdc12910d11cfb9d20e2c916fbf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0a62926c095df90a4cd6c15f9484f287b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
