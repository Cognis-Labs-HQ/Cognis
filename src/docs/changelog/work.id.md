# Identitas Sosial dan Notifikasi SSO yang Andal

**Cabang Fitur:** work

## Handle SSO Menjadi Identitas Profil

Profil SSO baru kini mengutamakan handle dari penyedia daripada ID akun Cognis yang tidak transparan, sementara ID akun tetap menjadi kunci kepemilikan kanonis.

## Notifikasi Mencapai Akun SSO

Pengiriman notifikasi kini memetakan handle profil ke ID akun kanonis. Notifikasi pengikut, pesan, reaksi, permintaan, dan panggilan sosial kini ditujukan ke identitas akun yang stabil tersebut.

## Polling Profil Mengikuti Siklus Hidup Rute dan Halaman

Penyegaran pengikut kini memakai rute daftar pengikut yang dipublikasikan, dan polling tidak dimulai setelah sinyal navigasi halaman dibatalkan.

## Tindakan Undang di Halaman Pengguna Dipulihkan

Gateway Registration kembali menyediakan tindakan **+ Undang** pada halaman Pengguna untuk pemilik dan pengguna pendiri yang memenuhi syarat. Tindakan disembunyikan saat token pendaftaran tidak tersedia atau kebijakan tidak mengizinkan undangan.

## Gaya dan Penempatan Tindakan Pendaftaran

Kontrol **+ Undang** kembali berada di atas tabel Pengguna sesuai penempatan sebelumnya, bukan di bilah alat halaman. Pemuatan halaman langsung memuat kemampuan Registration terlebih dahulu, administrator tetap tidak melihat entri tersebut di menu akun, dan **Masuk Sebagai Gantinya** kini memiliki ukuran yang sama dengan tindakan pendaftaran sambil mempertahankan gaya netral.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c20e406
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ce0d316b
- https://github.com/Cognis-Labs-HQ/Cognis/commit/f25b56c8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e1004e29
