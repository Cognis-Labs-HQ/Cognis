# Cakupan Tutorial

Daftar berikut mencakup halaman dasbor interaktif dan bagian administrasi milik komponen. Panduan tersedia hanya saat komponen aktif, halaman atau bagian yang terlihat cocok, serta akun memenuhi persyaratan akses.

## Cakupan

| Halaman / bagian                                           | Panduan                           | Akses          |
| ---------------------------------------------------------- | --------------------------------- | -------------- |
| `/settings` · `#general`                                   | Preferensi Akun                   | Pengguna masuk |
| `/settings` · `#appearance`                                | Tampilan                          | Pengguna masuk |
| `/settings` · `#language`                                  | Preferensi Bahasa                 | Pengguna masuk |
| `/settings` · `#datetime`                                  | Preferensi Waktu                  | Pengguna masuk |
| `/settings` · `#advanced`                                  | Preferensi Lanjutan               | Pengguna masuk |
| `/administration` · `#components`                          | Administrasi Komponen             | Administrator  |
| `/administration` · `#status`                              | Status Sistem                     | Administrator  |
| `/administration` · `#security`                            | Kebijakan Keamanan                | Administrator  |
| `/users`                                                   | Administrasi Pengguna             | Administrator  |
| `/administration/modules` · `.module-store-grid`           | Marketplace Modul                 | Administrator  |
| `^/docs(?:/\|$)`                                           | Dokumentasi                       | Pengguna masuk |
| `^/changelogs(?:/\|$)`                                     | Riwayat Rilis                     | Pengguna masuk |
| `/dashboard`                                               | Ruang Kerja Dan Latihan Pencarian | Pengguna masuk |
| `/administration/modules/:uuid` · `.module-detail-release` | Detail Modul                      | Administrator  |

## Panduan Komponen

Halaman, target, dan persyaratan akses setiap fitur didokumentasikan bersama komponen pemiliknya. Komponen opsional tidak menyediakan terjemahan atau definisi tutorial untuk halaman inti.

- [Panduan Kalender](/docs/gateways/calendar/tutorials)
- [Profil dan Postingan](/docs/adapters/social/profile/tutorials)
- [Panduan Pesan](/docs/adapters/social/messages/tutorials)
- [Panduan Kelas](/docs/adapters/study/classes/tutorials)
- [Panduan Papan Peringkat](/docs/adapters/study/leaderboard/tutorials)
- [Panduan Kartu Belajar](/docs/adapters/study/flashcards/tutorials)
- [Jelajahi Pustaka](/docs/adapters/study/library/tutorials)
- [Preferensi Belajar](/docs/gateways/study/tutorials)
- [Panduan Berbagi](/docs/gateways/share/tutorials)
- [Panduan Undangan](/docs/gateways/registration/tutorials)
- [Keamanan Akun](/docs/gateways/auth/tutorials)
- [Keamanan Dua Faktor](/docs/gateways/tfa/tutorials)
- [Preferensi Notifikasi](/docs/gateways/notify/tutorials)
- [Kuota Penyimpanan](/docs/gateways/files/tutorials)
- [Pemeriksaan Log](/docs/gateways/logging/tutorials)
- [Administrasi Sosial](/docs/gateways/social/tutorials)

## Modul Eksternal

Cakupan modul eksternal dipelihara di direktori `docs/` masing-masing repositori bersama penyedianya. Lihat [modul eksternal](/docs/modules/external) untuk kontrak integrasi.

## Batas yang Disengaja

Halaman lisensi dan kesalahan yang hanya dibaca, kode awal luring, serta fixture pengembangan tidak memiliki tur aksi. Callback masuk, persetujuan wajib, konfirmasi kata sandi, dan dialog penyiapan wajib mempertahankan aturan interaksinya. Halaman status penerima berbagi tidak otomatis mengungkap konten akun lain. Tampilan tertanam memakai kontrol tutorial dalam konteks halamannya sendiri.

## Panel Dan Tindakan Dasbor

Panduan Dasbor memiliki 18 langkah dan membuka panel notifikasi serta menu akun melalui penangan klik aslinya. Latihan klik mencegah hover, sedangkan penjelasan panel dan menu membiarkan tindakan penghapusan atau navigasi tidak aktif. Menu akun menjelaskan Pengaturan, Dokumentasi, tautan administrasi sesuai peran, dan Keluar. Panduan juga mencakup dok tindakan halaman, pengalihan bahasa, tampilan, dan penyuntingan tata letak.
