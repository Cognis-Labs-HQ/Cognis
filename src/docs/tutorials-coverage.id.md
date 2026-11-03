# Cakupan Tutorial

Daftar berikut mencakup halaman dasbor interaktif dan bagian administrasi milik komponen. Panduan tersedia hanya saat komponen aktif, halaman atau bagian yang terlihat cocok, serta akun memenuhi persyaratan akses.

## Cakupan

| Halaman / bagian                                 | Panduan                 | Akses          |
| ------------------------------------------------ | ----------------------- | -------------- |
| `/settings` · `#general`                         | Preferensi Akun         | Pengguna masuk |
| `/settings` · `#appearance`                      | Tampilan                | Pengguna masuk |
| `/settings` · `#language`                        | Preferensi Bahasa       | Pengguna masuk |
| `/settings` · `#datetime`                        | Preferensi Waktu        | Pengguna masuk |
| `/settings` · `#advanced`                        | Preferensi Lanjutan     | Pengguna masuk |
| `/administration` · `#components`                | Administrasi Komponen   | Administrator  |
| `/administration` · `#status`                    | Status Sistem           | Administrator  |
| `/administration` · `#security`                  | Kebijakan Keamanan      | Administrator  |
| `/users`                                         | Administrasi Pengguna   | Administrator  |
| `/administration/modules` · `.module-store-grid` | Marketplace Modul       | Administrator  |
| `^/docs(?:/\|$)`                                 | Dokumentasi             | Pengguna masuk |
| `^/changelogs(?:/\|$)`                           | Riwayat Rilis           | Pengguna masuk |
| `/calendar`                                      | Panduan Kalender        | Pengguna masuk |
| `^/profile(?:/\|$)`                              | Profil dan Postingan    | Pengguna masuk |
| `^/messages(?:/\|$)`                             | Panduan Pesan           | Pengguna masuk |
| `/classes` · `#class-list`                       | Panduan Kelas           | Pengguna masuk |
| `/my-classes`                                    | Kelas Saya              | Pengguna masuk |
| `^/study/leaderboard(?:/\|$)`                    | Panduan Papan Peringkat | Pengguna masuk |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`        | Panduan Kartu Belajar   | Pengguna masuk |
| `^/study/explore(?:/\|$)`                        | Jelajahi Pustaka        | Pengguna masuk |
| `^/study/library/search(?:/\|$)`                 | Pencarian Kamus         | Pengguna masuk |
| `^/study/(?:library/)?requests(?:/\|$)`          | Permintaan Pustaka      | Pengguna masuk |
| `^/study/library(?:/\|$)` · `.library-browser`   | Administrasi Pustaka    | Administrator  |
| `^/study/(?:settings\|welcome)$`                 | Preferensi Belajar      | Pengguna masuk |
| `/shares`                                        | Panduan Berbagi         | Pengguna masuk |
| `/invite`                                        | Panduan Undangan        | Pengguna masuk |
| `/settings` · `#auth-security-reset-panel`       | Keamanan Akun           | Pengguna masuk |
| `/settings` · `#tfa-settings-panel`              | Keamanan Dua Faktor     | Pengguna masuk |
| `/administration` · `#tfa-enforcement`           | Kewajiban Dua Faktor    | Administrator  |
| `/settings` · `#notif-matrix-container`          | Preferensi Notifikasi   | Pengguna masuk |
| `/administration` · `#notifications`             | Pengiriman Notifikasi   | Administrator  |
| `/administration` · `#broadcasts`                | Administrasi Siaran     | Administrator  |
| `/administration` · `[data-files-quota-admin]`   | Kuota Penyimpanan       | Administrator  |
| `/administration` · `#logs`                      | Pemeriksaan Log         | Administrator  |
| `/administration` · `#registration`              | Kebijakan Pendaftaran   | Administrator  |
| `/administration` · `#social`                    | Administrasi Sosial     | Administrator  |

## Modul Eksternal

Modul pendamping mencakup Analytics, ElevenLabs, pembelajaran Inggris dan Jepang, pertemuan dan administrasi Jitsi, ketiga halaman dokumen hukum, konfigurasi masuk X dan LINE, serta kanvas, konfigurasi, dan administrasi Whiteboard. Panduan tetap dimiliki dan dikemas oleh repositorinya.

Bagian administrasi Hukum juga memiliki panduan terbatas untuk penerbitan dan laporan persetujuan.

## Batas yang Disengaja

Halaman lisensi dan kesalahan yang hanya dibaca, kode awal luring, serta fixture pengembangan tidak memiliki tur aksi. Callback masuk, persetujuan wajib, konfirmasi kata sandi, dan dialog penyiapan wajib mempertahankan aturan interaksinya. Halaman status penerima berbagi tidak otomatis mengungkap konten akun lain. Tampilan tertanam memakai kontrol tutorial dalam konteks halamannya sendiri.
