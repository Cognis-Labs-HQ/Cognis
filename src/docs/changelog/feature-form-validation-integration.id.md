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

- [8c9fc0683b33aab169806f3783d5f702d272bf32](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c9fc0683b33aab169806f3783d5f702d272bf32)
- [497c7e6aec641d2288c3202a30fc5ce97149e600](https://github.com/Cognis-Labs-HQ/Cognis/commit/497c7e6aec641d2288c3202a30fc5ce97149e600)
- [d87c318ae94cd979dbbb38bae781db1fcc762315](https://github.com/Cognis-Labs-HQ/Cognis/commit/d87c318ae94cd979dbbb38bae781db1fcc762315)
