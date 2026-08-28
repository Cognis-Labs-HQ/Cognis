# Dependensi modul eksternal

## Instalasi sadar dependensi

Modul eksternal dapat menyatakan dependensi keras yang tidak dianjurkan dan dependensi lunak opsional. Instalasi kini menampilkan semua dependensi, memblokir persyaratan keras yang belum terpenuhi, memungkinkan administrator memilih pendamping opsional, dan mengaktifkan dependensi terpilih.

## Aktivasi dan kanal rilis yang andal

Membatalkan peringatan integritas modul kini menghentikan aktivasi dependensi dan alur konfigurasi wajib. Kanal rilis yang dipilih disimpan oleh server dan tetap tersedia setelah server dimulai ulang, bahkan sebelum instalasi.

## Verifikasi integritas tautan simbolis yang aman

Validasi SHASUM modul kini mengikuti tautan simbolis berkas yang mengarah ke dalam modul, termasuk alias `AGENTS.md` ke `.github/copilot-instructions.md`, sambil menolak tautan rusak, direktori, dan target di luar modul.

## Alias terverifikasi dan pemberitahuan pembatalan

Alias tautan simbolis yang tidak dideklarasikan tidak lagi memicu peringatan SHASUM ketika mengarah ke berkas modul yang sudah dideklarasikan dan diverifikasi. Pembatalan instalasi kini menampilkan pemberitahuan yang jelas.

## Kartu dependensi untuk instalasi dan pengaktifan

Konfirmasi dependensi kini menampilkan kartu modul lengkap dengan label wajib, opsional, dan direkomendasikan serta tautan langsung ke detail. Pemeriksaan dijalankan sebelum instalasi maupun pengaktifan dan dilewati ketika semua dependensi sudah aktif.

## Kontrol dependensi yang konsisten

Kartu dependensi kini menggunakan kembali palet pil status aplikasi. Navigasi detail memakai aset chevron SVG bertema yang sudah ada, bukan panah teks.

## Pengaktifan dependensi langsung

Setiap kartu dependensi yang belum terpenuhi kini menyediakan tindakan unduh SVG langsung dengan umpan balik pemuatan yang memasang dan mengaktifkan dependensi tersebut. Tindakan utama menampilkan Instal atau Aktifkan, tetap dinonaktifkan jika dependensi wajib belum terpenuhi, menggunakan tindakan netral aplikasi selama dependensi opsional tersisa, dan berubah ke gaya konfirmasi setelah semua dependensi aktif.

## Kesiapan dependensi sebelum progres

Instal dan Aktifkan kini menjalankan gerbang kesiapan dependensi penuh yang sama sebelum tindakan siklus hidup memasuki status pemuatan. Membatalkan popup dependensi segera menghentikan alur tanpa membiarkan indikator tindakan modul terus berputar.

## Penonaktifan dependensi keras berantai

Menonaktifkan modul kini secara rekursif menonaktifkan setiap modul aktif yang menyatakannya sebagai dependensi keras, sementara modul dengan dependensi lunak tetap aktif. Kartu dependensi kini memakai SVG unduhan khusus dengan baki, bukan panah turun umum.

## Tindakan dependensi sesuai tema

Kontrol unduh dan putar dependensi kini memakai aset SVG terang dan gelap khusus. Dependensi yang terpasang tetapi dinonaktifkan menampilkan Putar alih-alih Unduh, dan teks pil status mengikuti tema aktif sambil mempertahankan latar status yang sudah ada.

## Kontras ikon yang tepat pada kedua tema

Kontrol unduh dan putar dependensi kini memakai ikon gelap pada permukaan terang dan ikon terang dalam mode gelap, sehingga kedua tindakan tetap terlihat pada tema mana pun.

## Konfigurasikan dependensi sebelum aktivasi

Dependensi yang memerlukan pengaturan awal kini membuka dialog konfigurasinya di atas pengelola dependensi sebelum aktivasi dicoba. Menyimpan pengaturan yang valid memungkinkan aktivasi berlanjut tanpa berakhir pada galat konfigurasi sisi server.

## Pulihkan status modul

Penonaktifan sementara untuk pembaruan, pembaruan paksa, dan perubahan kanal rilis kini mempertahankan status aktif modul yang diperbarui beserta semua modul aktif yang bergantung secara wajib. Modul bergantung kembali aktif setelah pembaruan dalam proses, sedangkan mulai ulang server yang diwajibkan memulihkan status yang sama saat proses awal.

## Tipe manifes lengkap

Kontrak manifes modul kanonis kini mendeklarasikan dependensi eksternal wajib dan opsional sehingga pembuat modul TypeScript dan pemakai inti dapat menggunakan metadata dependensi tanpa konversi tipe yang tidak aman.

## Pemulihan dependensi tervalidasi

Pemulihan saat proses awal dan setelah pembaruan kini membiarkan modul tetap nonaktif jika dependensi keras atau pemeriksaan pengaktifannya gagal. Kolom dependensi manifes eksternal menolak nilai yang tidak valid sebelum mencapai antarmuka Administrasi.

## Komit

**Cabang Fitur:** feature-add-popup-for-managing-module-dependencies

- [Validasi pemulihan dependensi modul](https://github.com/Cognis-Labs-HQ/Cognis/commit/755fd2af)
