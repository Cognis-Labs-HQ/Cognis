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
| `/calendar`                                                | Panduan Kalender                  | Pengguna masuk |
| `^/profile(?:/\|$)`                                        | Profil dan Postingan              | Pengguna masuk |
| `^/messages(?:/\|$)`                                       | Panduan Pesan                     | Pengguna masuk |
| `/classes` · `#class-list`                                 | Panduan Kelas                     | Pengguna masuk |
| `/my-classes`                                              | Kelas Saya                        | Pengguna masuk |
| `^/study/leaderboard(?:/\|$)`                              | Panduan Papan Peringkat           | Pengguna masuk |
| `^/study/(?:[a-z-]+/)?flashcards(?:/\|$)`                  | Panduan Kartu Belajar             | Pengguna masuk |
| `^/study/explore(?:/\|$)`                                  | Jelajahi Pustaka                  | Pengguna masuk |
| `^/study/library/search(?:/\|$)`                           | Pencarian Kamus                   | Pengguna masuk |
| `^/study/(?:library/)?requests(?:/\|$)`                    | Permintaan Pustaka                | Pengguna masuk |
| `^/study/library(?:/\|$)` · `.library-browser`             | Administrasi Pustaka              | Administrator  |
| `^/study/(?:settings\|welcome)$`                           | Preferensi Belajar                | Pengguna masuk |
| `/shares`                                                  | Panduan Berbagi                   | Pengguna masuk |
| `/invite`                                                  | Panduan Undangan                  | Pengguna masuk |
| `/settings` · `#auth-security-reset-panel`                 | Keamanan Akun                     | Pengguna masuk |
| `/settings` · `#tfa-settings-panel`                        | Keamanan Dua Faktor               | Pengguna masuk |
| `/administration` · `#tfa-enforcement`                     | Kewajiban Dua Faktor              | Administrator  |
| `/settings` · `#notif-matrix-container`                    | Preferensi Notifikasi             | Pengguna masuk |
| `/administration` · `#notifications`                       | Pengiriman Notifikasi             | Administrator  |
| `/administration` · `#broadcasts`                          | Administrasi Siaran               | Administrator  |
| `/administration` · `[data-files-quota-admin]`             | Kuota Penyimpanan                 | Administrator  |
| `/administration` · `#logs`                                | Pemeriksaan Log                   | Administrator  |
| `/administration` · `#registration`                        | Kebijakan Pendaftaran             | Administrator  |
| `/administration` · `#social`                              | Administrasi Sosial               | Administrator  |
| `/dashboard`                                               | Ruang Kerja Dan Latihan Pencarian | Pengguna masuk |
| Flashcards · `[data-study-session]`                        | Kelola Dek                        | Pengguna masuk |
| Flashcards · `[data-practice]`                             | Latihan Dengan Dek                | Pengguna masuk |
| `/administration/modules/:uuid` · `.module-detail-release` | Detail Modul                      | Administrator  |

## Modul Eksternal

Modul pendamping mencakup Analytics, ElevenLabs, pembelajaran Inggris dan Jepang, pertemuan dan administrasi Jitsi, ketiga halaman dokumen hukum, konfigurasi masuk X dan LINE, serta kanvas, konfigurasi, dan administrasi Whiteboard. Panduan tetap dimiliki dan dikemas oleh repositorinya.

Bagian administrasi Hukum juga memiliki panduan terbatas untuk penerbitan dan laporan persetujuan.

## Batas yang Disengaja

Halaman lisensi dan kesalahan yang hanya dibaca, kode awal luring, serta fixture pengembangan tidak memiliki tur aksi. Callback masuk, persetujuan wajib, konfirmasi kata sandi, dan dialog penyiapan wajib mempertahankan aturan interaksinya. Halaman status penerima berbagi tidak otomatis mengungkap konten akun lain. Tampilan tertanam memakai kontrol tutorial dalam konteks halamannya sendiri.

## Panduan Tugas

Cakupan mencakup 55 panduan dan 175 langkah, termasuk 22 panduan administrator. Dasbor memiliki latihan pencarian langsung: buka kontrol pencarian asli, masukkan kueri, periksa opsi dan hasil, lalu tutup pencari sebelum melanjutkan. Langkah penjelasan mencegah hover dan aktivasi yang tidak disengaja; langkah interaktif mengizinkan targetnya secara eksplisit. Panduan kontekstual muncul saat detail dek, sesi latihan, atau detail modul terlihat.

Panduan fitur mencakup memulai dan mempratinjau pesan, anggota ruang, pratinjau kiriman, navigasi kalender dan perencanaan acara, perubahan acara berulang, filter pembagian dan kedaluwarsa, undangan, filter pustaka dan perbandingan kamus, latihan audio dan menulis, favorit dan permintaan konten, pembuatan dek, umpan balik latihan, edit/bagikan/ekspor dek, pendaftaran kelas, peringkat, fon, perubahan belum disimpan, pemberitahuan rilis, pencarian akun, serta konfigurasi dan siklus hidup modul. Formulir dan konfirmasi penghapusan tetap menjadi tindakan sadar milik fitur; panduan menjelaskan titik masuknya dan mengalah pada dialog wajib.

## Panel Dan Tindakan Dasbor

Panduan Dasbor memiliki 18 langkah dan membuka panel notifikasi serta menu akun melalui penangan klik aslinya. Latihan klik mencegah hover, sedangkan penjelasan panel dan menu membiarkan tindakan penghapusan atau navigasi tidak aktif. Menu akun menjelaskan Pengaturan, Dokumentasi, tautan administrasi sesuai peran, dan Keluar. Panduan juga mencakup dok tindakan halaman, pengalihan bahasa, tampilan, dan penyuntingan tata letak.
