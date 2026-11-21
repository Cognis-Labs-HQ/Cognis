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

- [c396bee5dfcdb2e21e69e9b79ddae6f6ed61a600](https://github.com/Cognis-Labs-HQ/Cognis/commit/c396bee5dfcdb2e21e69e9b79ddae6f6ed61a600)
- [8a1c44bad0c99cd4a823421faaeb40ea992dcb86](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a1c44bad0c99cd4a823421faaeb40ea992dcb86)
