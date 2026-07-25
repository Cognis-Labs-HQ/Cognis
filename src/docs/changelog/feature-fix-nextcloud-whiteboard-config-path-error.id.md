# Startup administrasi modul yang andal

## Mendaftarkan rute kolaborasi sebelum inisialisasi profil

Nextcloud Whiteboard kini mendaftarkan rute daftar papan dan pemeriksaan awal meskipun layanan profil diinisialisasi belakangan. Permintaan menggunakan kapabilitas profil terkini sehingga mencegah respons rute tidak ditemukan sementara selama startup.

## Membatasi kesiapan startup pada modul pemilik

Keandalan startup ditangani di dalam Nextcloud Whiteboard alih-alih menunda setiap permintaan API. Dengan demikian, siklus hidup server bersama tidak berubah sementara rute administrasi terkait tersedia secara independen dari layanan profil.

## Menjaga konfigurasi tetap independen dari layanan profil

Nextcloud Whiteboard kini mendaftarkan endpoint konfigurasi dan pengaktifannya segera setelah penyimpanan basis data tersedia. Administrator dapat mengonfigurasi modul meskipun layanan profil terpisah yang diperlukan untuk kolaborasi whiteboard tidak tersedia.
