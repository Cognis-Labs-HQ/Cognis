# Integrasi Ucapan Bersama

**Cabang Fitur:** feature-update-external-package-contract-definitions

## Penggunaan

Pindahkan sintesis ElevenLabs ke modul terpisah yang dapat dikonfigurasi. Study memakai suara opsional per bahasa untuk kartu global tersimpan, sedangkan kartu pribadi dan kelas menerima unggahan terbatas dan rekaman mikrofon. Pertahankan komposisi kalimat berkelanjutan sebagai cadangan dari rekaman penyusun yang tersedia. Administrator dapat membuat ulang audio global saat mengedit.

## Perbaiki aktivasi Study

Naikkan versi paket konten Inggris dan Jepang saat menghapus rekaman bawaan. Selesaikan rekonsiliasi modul lain sebelum melaporkan aktivasi gagal agar rute persetujuan tetap memiliki alur terdaftar.

## Terbitkan ucapan tanpa hak istimewa

Terbitkan `elevenlabs-tts:synthesis` di namespace milik modul dan hapus penanda hak istimewa. Study Inggris dan Jepang menemukan kapabilitas ini melalui ctx dengan dependensi modul opsional yang ada. Jembatan Study menerima pengambil kapabilitas langsung dari pemanggil sehingga penonaktifan, pengaktifan kembali, dan suara yang diatur tetap berfungsi.

## Pertahankan ucapan opsional

Kapabilitas yang diterbitkan melaporkan kesiapan langsung melalui `configured`. Study mengaktifkan ucapan otomatis hanya setelah kunci API dan suara bawaan disimpan. Jika ElevenLabs tidak terpasang, dinonaktifkan, atau belum diatur, pendaftaran bahasa tetap berhasil dan audio unggahan serta komposisi cadangan tetap tersedia tanpa meminta sintesis.

## Jalankan flow konfigurasi saat nonaktif

Izinkan entrypoint konfigurasi terisolasi mendaftarkan dan menjalankan flow miliknya saat modul nonaktif. Ini memperbaiki konfigurasi ElevenLabs yang mengembalikan `speech_unavailable` sebelum aktivasi. Tolak registrasi flow dan hook milik pihak lain meskipun modul nonaktif memiliki hak istimewa, serta hapus flow parsial jika penyiapan gagal.

## Pertahankan rute saat penyegaran modul

Tunggu permintaan modul aktif sebelum menghapus flow-nya, dan tunda permintaan baru hingga rekonsiliasi selesai, termasuk ketika aktivasi gagal. Pemeriksaan persetujuan mempertahankan siklus hidup rute dan flow yang utuh saat modul Study lain diaktifkan.

## Komit

- [2bebe47](https://github.com/Cognis-Labs-HQ/Cognis/commit/2bebe47baf20112a4c84cff2bb65ce270c6b52eb)
- [7c495dc](https://github.com/Cognis-Labs-HQ/Cognis/commit/7c495dcda4c67bdff3c385670465baee4763b046)
- [a59ae79](https://github.com/Cognis-Labs-HQ/Cognis/commit/a59ae79222ed483ba3804bf4cdebba9beaa75203)
- [393b357](https://github.com/Cognis-Labs-HQ/Cognis/commit/393b357411ab2f828c785afc53a831ccc9dda626)
- [8c1364c](https://github.com/Cognis-Labs-HQ/Cognis/commit/8c1364cb57d291083ef77d39453787892a951d80)
