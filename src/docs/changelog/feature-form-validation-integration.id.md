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

- [47f407cd521a3e58adf7c371977970a0b7d5d0d2](https://github.com/Cognis-Labs-HQ/Cognis/commit/47f407cd521a3e58adf7c371977970a0b7d5d0d2)
- [8b78edeee17d2959ba6d93f290cd4ecded080b8c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8b78edeee17d2959ba6d93f290cd4ecded080b8c)
- [27f332f3075194ce66dac482f706a9705f3cfd57](https://github.com/Cognis-Labs-HQ/Cognis/commit/27f332f3075194ce66dac482f706a9705f3cfd57)
- [1bd071a27173f7e7a684832b8c3f4d31445d7a9b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1bd071a27173f7e7a684832b8c3f4d31445d7a9b)
