# Privasi Pemblokiran Lebih Kuat di Pencarian dan Rapat

**Cabang Fitur:** feature-restrict-blocked-user-interactions

## Pengguna yang diblokir tidak lagi menemukan pemblokir melalui pencarian

Pencarian profil kini menyembunyikan akun apa pun yang telah memblokir peminta. Ini berlaku untuk pencarian global, pencarian pengguna sosial, dan pencarian peserta rapat, termasuk saat peminta memiliki peran admin di luar halaman pengguna Administrasi.

## Pengguna yang diblokir dicegah berinteraksi dalam rapat

Pemeriksaan akses rapat kini menolak sesi ketika penyelenggara atau peserta rapat telah memblokir peminta. Notifikasi rapat juga melewati penerima yang tidak boleh melihat aktivitas penyelenggara karena pemblokiran.

## Komit

- [17431b6](https://github.com/Cognis-Labs-HQ/Cognis/commit/17431b6df2bdf6b47df8ddfbe98d64a997bb196f)
