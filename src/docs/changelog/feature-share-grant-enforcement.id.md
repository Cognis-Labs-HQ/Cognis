# Penegakan Hak Berbagi

**Cabang Fitur:** feature-share-grant-enforcement

## Periksa kedaluwarsa saat akses

Berbagi langsung kepada pengguna tidak lagi memberi akses setelah kedaluwarsa, termasuk berbagi yang telah dibuka dengan kata sandi dan disimpan dalam riwayat. Nilai kedaluwarsa kosong tetap tanpa batas; nilai tidak kosong yang tidak valid menolak akses.

## Hormati pencabutan hak eksplisit

PATCH dengan `grantedCapabilities: []` menghapus semua kapabilitas yang diberikan. Tanpa bidang tersebut, hak tetap dipertahankan; larik tidak kosong menggantikannya. Pemeriksaan penerima, kata sandi, dan adaptor tetap berlaku.

## Komit

- [494c33c61dc193364755f8474c6905b96d786520](https://github.com/Cognis-Labs-HQ/Cognis/commit/494c33c61dc193364755f8474c6905b96d786520)
