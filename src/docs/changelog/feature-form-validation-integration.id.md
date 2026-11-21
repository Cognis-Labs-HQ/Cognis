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

- [7751793f494f1177c28987e3a74d7dbe0cb2e200](https://github.com/Cognis-Labs-HQ/Cognis/commit/7751793f494f1177c28987e3a74d7dbe0cb2e200)
- [76e82854c8ba2fc31aa94027d5578127ca041ed0](https://github.com/Cognis-Labs-HQ/Cognis/commit/76e82854c8ba2fc31aa94027d5578127ca041ed0)
- [68ea2d586774d81fa915d1df36fda3ab8a2f8912](https://github.com/Cognis-Labs-HQ/Cognis/commit/68ea2d586774d81fa915d1df36fda3ab8a2f8912)
- [103319a5a0e31443f7cb6d0bdb85e36e1e1f6e8b](https://github.com/Cognis-Labs-HQ/Cognis/commit/103319a5a0e31443f7cb6d0bdb85e36e1e1f6e8b)
