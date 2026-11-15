# Validasi Formulir Aksesibel

**Cabang Fitur:** feature-form-validation-integration

## Jelaskan kesalahan terperiksa

Pemeriksaan khusus yang gagal menandai kolom terkait dan menghubungkan persyaratan terjemahan yang belum terpenuhi tanpa mengganti deskripsi pemanggil. Perbaikan menghapus hubungan kesalahan milik pembuat formulir. Batasan bawaan, penanda wajib, navigasi tab, dan pengiriman formulir mempertahankan kontrak yang ada.

## Akhiri pendengar validasi

Melepas atau membatalkan pengaitan formulir menghapus pendengar input, perubahan, dan kehilangan fokus beserta status ARIA miliknya. Pengaitan ulang tidak menggandakan pendengar lama. Pemanggilan validasi secara eksplisit tetap tersedia.

## Dokumentasikan panduan bersama

Empat panduan UI menjelaskan validasi dan cakupan tutorial yang ada. Pengujian menjalankan titik masuk publik pembuat formulir serta kriteria dialog kata sandi sebenarnya dengan pembacaan kebijakan sintetis dan pembatalan saja.

## Pertahankan kesalahan pemanggil terbaru

Pemeriksaan tidak valid berulang mempertahankan nilai atau penghapusan kesalahan ARIA terbaru dari pemanggil. Perbaikan, pelepasan, dan pembatalan memulihkan status tersebut tanpa mengganti deskripsi lain. Nilai true yang sama tidak dapat dikaitkan dengan pemilik berbeda.

## Hentikan tampilan yang terputus

Jika kriteria khusus melepas atau membatalkan pengaitan formulir, validasi kolom atau seluruh formulir yang berjalan mengembalikan hasilnya tanpa memulihkan tampilan setelah pembersihan. Validasi eksplisit berikutnya tetap tersedia dan pelepasan berikutnya membersihkan statusnya.

## Komit

- [def09ee4825dd0fb636b56cbdecc8b2e6a3f1920](https://github.com/Cognis-Labs-HQ/Cognis/commit/def09ee4825dd0fb636b56cbdecc8b2e6a3f1920)
- [80d2e9190e3eb12d273378259384a327c1d5c55c](https://github.com/Cognis-Labs-HQ/Cognis/commit/80d2e9190e3eb12d273378259384a327c1d5c55c)
- [aef6aebc79a43bb30c1f9c53d86de0aec893c165](https://github.com/Cognis-Labs-HQ/Cognis/commit/aef6aebc79a43bb30c1f9c53d86de0aec893c165)
- [c101aaba5e70c5ef79ec79940a5d8eef86466c40](https://github.com/Cognis-Labs-HQ/Cognis/commit/c101aaba5e70c5ef79ec79940a5d8eef86466c40)
