# Penegakan Hak Berbagi

**Cabang Fitur:** feature-share-grant-enforcement

## Periksa kedaluwarsa saat akses

Berbagi langsung kepada pengguna tidak lagi memberi akses setelah kedaluwarsa, termasuk berbagi yang telah dibuka dengan kata sandi dan disimpan dalam riwayat. Nilai kedaluwarsa kosong tetap tanpa batas; nilai tidak kosong yang tidak valid menolak akses.

## Hormati pencabutan hak eksplisit

PATCH dengan `grantedCapabilities: []` menghapus semua kapabilitas yang diberikan. Tanpa bidang tersebut, hak tetap dipertahankan; larik tidak kosong menggantikannya. Pemeriksaan penerima, kata sandi, dan adaptor tetap berlaku.

## Komit

- [1f5c4f101876d150f9ee130a00297fbb266d4399](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f5c4f101876d150f9ee130a00297fbb266d4399)
- [bb1d6a4e69171f0abfe3792028a9137855224315](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb1d6a4e69171f0abfe3792028a9137855224315)
