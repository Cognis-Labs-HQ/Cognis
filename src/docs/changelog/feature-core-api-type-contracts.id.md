# Kontrak Tipe Core dan API

**Cabang Fitur:** feature-core-api-type-contracts

## Kontrak Publik Bertipe

Satukan peran akses, deklarasikan kebutuhan kapabilitas modul dan identitas akun, serta pertahankan metadata komponen bertipe. Selaraskan pencarian kapabilitas dan penemuan direktori dengan kontrak runtime.

Daftar akses namespace menerima ID komponen hanya-baca sehingga entri registri gateway Files tetap tidak dapat diubah. Helper hasil alur menerima kumpulan hasil tahap yang tidak tersedia dan mengembalikan null sesuai perilaku runtime yang sudah ada.

## Data Uji API Bertipe

Gunakan data modul lengkap, penyimpanan kapabilitas terdaftar, dan basis data dokumen uji milik API. Perbaiki peran penyediaan akun dan tanda terima kredensial sumber dalam pengujian tanpa mengubah muatan rute.

## Versi

Naikkan Core ke 0.6.3 dan API ke 0.13.32, beserta entri berkas kunci workspace dan batas dependensi Core yang sesuai.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e34777ea07ccb815f00b541cf131f89f9210e4e0
