# Batas Akun Istimewa

**Cabang Fitur:** feature-auth-tfa-target-policy

## Lindungi Target Akun

Satukan otorisasi akun istimewa di Auth dan terapkan sebelum setiap pembacaan atau perubahan TFA lintas akun, termasuk rotasi kode pemulihan dan pengaturan ulang administrator. Pertahankan izin pemilik dan layanan mandiri sambil menolak kebijakan tidak tersedia, akun tidak dikenal, dan masa berlaku kedaluwarsa. Pengelolaan pengguna memakai kontrak yang sama tanpa kehilangan pembatasan khusus tindakannya.

## Verifikasi Kontrak Pemilik

Uji kebijakan bertahap yang nyata dan rute terdaftar dengan peran sintetis, metadata pendiri, target yang hilang, masukan tidak valid, kegagalan kapabilitas, dan perubahan masa berlaku tertunda. Selaraskan Auth 2.2.12, TFA 1.3.13, dan API 0.13.36 dengan panduan integrasi empat bahasa.

## Periksa Ulang Sebelum Efek

Peroleh kembali otorisasi Users setelah persiapan permintaan dan pada efek deprovision pertama milik Auth. Pertahankan identitas aktor yang tidak dapat diubah, tolak perubahan peran/pendiri yang terlambat serta masa berlaku yang dicabut, dan selesaikan sinkronisasi profil untuk promosi admin yang sah. Pisahkan rekonsiliasi sistem LDAP dan dokumentasikan batas penyelesaian sebagian. Tambahkan regresi permanen untuk isi permintaan tertunda, metadata, tahap alur, dan guard tidak valid.

Kegagalan pengaturan TFA dan perubahan peran Users memakai pesan cadangan terlokalisasi yang ada, bukan kode server sembarang sebagai kunci terjemahan atau kode kebijakan mentah. Tutorial yang ada tidak memerlukan kontrol atau langkah baru.

## Autentikasi Hasil Pembersihan

Auth mengikat bukti deprovision ke input asli dan pemanggilan; Users serta setiap konsumen pembersihan bawaan mewajibkan hasil milik pemilik tersebut. Tolak hasil tahap berikutnya yang dipalsukan dan pemutaran ulang lintas pemanggilan tanpa mengotorisasi ulang efek yang selesai. Perbarui versi komponen, batas dependensi teruji, serta panduan penerapan empat bahasa. Companion Jitsi lama yang diaudit tetap menjadi dependensi penerapan: pindahkan hook pembersihannya atau nonaktifkan sebelum instalasi dianggap terlindungi.

## Pertahankan Amplop Pemanggilan

Core 0.6.6 membekukan secara dangkal referensi konteks alur yang sudah dinyatakan hanya-baca, sambil mempertahankan perubahan isi input/data/hasil dan urutan tahap. Auth memeriksa jaminan runtime ini dan menolak runner lama. Tambahkan kontrol pemutaran ulang pasangan, versi campuran, dan runner nyata generik; perbarui 23 batas Core teruji dan verifikasi resolusi workspace publik. Audit statis repositori dan companion tidak menemukan penugasan tingkat teratas yang didukung.

## Commit

- [f4ad2269b3fc37cab59b8da66171fd37711d9150](https://github.com/Cognis-Labs-HQ/Cognis/commit/f4ad2269b3fc37cab59b8da66171fd37711d9150)
- [7943302e75089b0f88160464a9ed11c842728c56](https://github.com/Cognis-Labs-HQ/Cognis/commit/7943302e75089b0f88160464a9ed11c842728c56)
- [365f5a4ccaa0a98ce8e33319575192778df6290c](https://github.com/Cognis-Labs-HQ/Cognis/commit/365f5a4ccaa0a98ce8e33319575192778df6290c)
- [6331f9ace2f2dc155d85f2eab36ff60e5f3d403c](https://github.com/Cognis-Labs-HQ/Cognis/commit/6331f9ace2f2dc155d85f2eab36ff60e5f3d403c)
