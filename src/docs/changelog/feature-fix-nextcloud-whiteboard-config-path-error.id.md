# Startup administrasi modul yang andal

**Feature Branch:** feature-fix-nextcloud-whiteboard-config-path-error

## Melaporkan kesiapan modul dari status Whiteboard

Endpoint kesiapan Whiteboard kini mencerminkan status basis data dan konfigurasi tanpa mengulangi pemeriksaan dependensi profil dari siklus hidup modul. Adapter profil yang aktif tidak lagi keliru dilaporkan tidak tersedia akibat urutan inisialisasi.

## Mendaftarkan rute kolaborasi sebelum inisialisasi profil

Nextcloud Whiteboard kini mendaftarkan rute daftar papan dan pemeriksaan awal meskipun layanan profil diinisialisasi belakangan. Permintaan menggunakan kapabilitas profil terkini sehingga mencegah respons rute tidak ditemukan sementara selama startup.

## Membatasi kesiapan startup pada modul pemilik

Keandalan startup ditangani di dalam Nextcloud Whiteboard alih-alih menunda setiap permintaan API. Dengan demikian, siklus hidup server bersama tidak berubah sementara rute administrasi terkait tersedia secara independen dari layanan profil.

## Menjaga konfigurasi tetap independen dari layanan profil

Nextcloud Whiteboard kini mendaftarkan endpoint konfigurasi dan pengaktifannya segera setelah penyimpanan basis data tersedia. Administrator dapat mengonfigurasi modul meskipun layanan profil terpisah yang diperlukan untuk kolaborasi whiteboard tidak tersedia.

## Commits

- [0b0a8a9](https://github.com/Cognis-Labs-HQ/Cognis/commit/0b0a8a9672abe9c37b3d298cd494e6504aed5489)
