# Tutorial terpandu

**Feature Branch:** feature-guided-tutorials-stacked

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

Host mengelola tampilan, aksesibilitas, pembatasan peristiwa, pencarian target dan pembersihan siklus hidup. Contoh ruang kerja dan Study berada di komponen pemiliknya. Modul eksternal mendaftarkan alur dan target melalui ctx tanpa mengimpor implementasi internal host. Pengujian mencakup flow terdaftar, target hilang atau diganti, pembatalan asinkron, izin, pemulihan kegagalan penyedia dan handle kedaluwarsa. Pemeriksaan Chromium mencakup fokus, gulir, zoom, pembatasan papan ketik dan sentuhan, peran aksesibilitas, pengurangan gerakan dan kedua tema.

## Ikatan Halaman dan Kunjungan Awal

Semua tombol aksi tutorial berada dalam instans terpisah dari menu mengambang bersama. Sesi pertama tidak memiliki Batal atau Lewati; Escape tidak menutupnya. Berikutnya tetap tersedia saat menunggu target, pekerjaan asinkron, atau langkah berbasis peristiwa, sehingga menekannya berulang selalu menyelesaikan panduan. Pemutaran ulang menyediakan Batal dengan `btn-cancel`. Navigasi lain, riwayat, perubahan akun atau izin, pelepasan penyedia, dan dialog wajib tetap membersihkan sesi. Tutorial tidak menyetujui dialog, mengirim formulir berizin khusus, atau memulai panggilan.

## Panduan Milik Komponen

Halaman memberikan kontribusi yang ditulis melalui larik `tutorials` pada composer. Setiap kontribusi menetapkan pemilik, definisi, dan `minRole` opsional; setiap definisi memberikan halaman, teks terlokalisasi, dan selektor milik komponen. `scope` membatasi pencarian pada bagian yang terlihat. Host menerbitkan target bersiklus hidup terbatas dan mendaftar melalui `ui:tutorial:mountPage`. Pelepasan halaman membersihkan panduannya. Penyedia opsional dapat memakai `mountTutorialProvider` dari `ui:reuse` sambil tetap memiliki lokalisasi dan siklus hidupnya.

## Kunci Terjemahan Modul

Kunci tutorial mempertahankan ID modul manifes sebagai satu segmen ruang nama. Label navigasi dan pencarian umum memakai katalog bersama. Kegagalan penyiapan halaman melepaskan semua kontribusi tutorial agar halaman dapat dimuat ulang.

## Katalog Tutorial

Katalog bahasa tutorial dimuat dengan revisi berdasarkan kunci terjemahan yang dideklarasikan, terpisah dari pemuatan katalog halaman sebelumnya. Ini mencegah katalog lama dalam memori menolak teks tutorial yang baru diterbitkan. Kontrak panduan yang sama memakai kembali katalog, termasuk saat luring. Teks bahasa pilihan yang tidak tersedia memakai bahasa Inggris; kunci bahasa Inggris yang benar-benar hilang tetap menggagalkan pendaftaran dan membatalkan pemiliknya. Kunci langkah memakai nama topik, bukan urutannya.

## Komit

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
- [73d206f](https://github.com/Cognis-Labs-HQ/Cognis/commit/73d206f37913e3cf6d8a7fcf8eed31c383f811f4)
- [9bd2026](https://github.com/Cognis-Labs-HQ/Cognis/commit/9bd2026bf195a4e815b5822f968b94796b99244a)
