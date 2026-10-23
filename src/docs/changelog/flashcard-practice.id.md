# Latihan Kartu

**Feature Branch:** feature-update-external-package-contract-definitions

## Filter Latihan

Dek langsung membuka latihan. Total mencakup semua kartu; Baru mencakup kartu tanpa catatan ulasan; Jatuh Tempo mencakup kartu yang telah diulas dan waktunya telah tiba; Selesai mencakup kartu dengan jadwal berikutnya. Kartu baru, termasuk dalam Total, menampilkan kartu lengkap. Kartu lain hanya memperlihatkan jawaban setelah pilihan bacaan salah atau goresan ditolak. Memilih kategori memulai antrean baru.

## Membaca dan Menulis

Membaca menawarkan pelafalan utama serta tiga pelafalan berbeda dari kemiripan Perpustakaan yang terlihat dan berperingkat, sama seperti Jelajahi. Membaca tersedia hanya jika ada tiga pengecoh sah. Menulis menyematkan seluruh papan gambar Study bersama, mengunci karakter, dan menilai urutan goresan. Kartu yang tidak didukung dapat dilewati tanpa mencatat ulasan berhasil. Jawaban benar dan kartu baru dijadwalkan sebagai Baik; jawaban salah sebagai Lagi.

## Jelajahi dan Ekspor

Label, pelafalan, dan definisi dari Perpustakaan menautkan kartu sumber di Jelajahi. Konfirmasi melindungi sesi saat meninggalkan latihan. Sumber yang tidak dapat diakses tetap dilindungi izin Perpustakaan dan tidak dapat dibuka melalui salinan bersama. Ekspor menggunakan ikon unduh bertema di kanan atas, hanya untuk pembuat atau administrator. Menu Kartu Belajar tetap aktif pada halaman dek.

## Kontrak Alur

Tindakan peramban menjalankan alur study:decks dengan tahap before, execute, dan after. Daftar dan detail server menjalankan authorize, read, dan audit; penyimpanan, ulasan, dan penghapusan mempertahankan validasi, izin, dan transaksi. Study memiliki papan gambar, penyusunan pola, kemiripan, dan alur tindakan bersama. Adaptor Gambar opsional hanya mengintegrasikan papan mengambang; Menulis tertanam tetap tersedia tanpanya. Halaman dan sesi dibatalkan saat ditinggalkan.

## Komit

- [6711b43b](https://github.com/Cognis-Labs-HQ/Cognis/commit/6711b43b9e01071fb2870536ac31e40157fc7354)
- [7dba3a24](https://github.com/Cognis-Labs-HQ/Cognis/commit/7dba3a243376b31550328461840e869787092e5e)
