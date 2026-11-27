# Ukuran Grid Composer

**Cabang Fitur:** feature-composer-grid-dimensions

## Lebar Penuh yang Konsisten

Deklarasi array lebar penuh kini menggunakan semua kolom yang tersedia pada composer utama dan bersarang, termasuk tata letak formulir masuk dan pendaftaran. Batas tinggi numerik dan pengisian tinggi tetap bekerja secara terpisah.

## Seret Melewati Grid

Menyeret widget ke bawah grid saat ini memperluas konten, lapisan grid, dan bayangan target peletakan secara bersamaan. Area baru tetap tersedia sampai widget dilepas.

## Pratinjau Akurat dan Ruang untuk Kontrol

Pratinjau seret dan pegangan pengubahan ukuran kini menggunakan ukuran yang sama dengan kartu yang dirender, termasuk jarak dan penempatan setengah kisi. Pengukuran editor memperhitungkan inset konten dan bilah gulir. Panel Elemen menggunakan lebar yang tersedia agar label tindakannya tetap terbaca di desktop, tablet, dan ponsel. Posisi panel memakai lebar yang diukur setelah batas tinggi diterapkan, termasuk bilah gulir internal.

## Penyuntingan Sentuh Stabil

Widget mempertahankan titik pegangan alih-alih melompat ke bawah penunjuk. Editor utama dan bersarang mendukung pengguliran tepi, pembatalan penunjuk, dan sasaran pengubahan ukuran untuk layar sentuh. Panel Elemen menyesuaikan ukuran dengan isinya dan dapat diperkecil menjadi judul saja. Saat menyimpan, editor tetap aktif sampai penyimpanan berhasil, termasuk ketika ukuran viewport berubah.

## Kontrol Ukuran yang Akurat

Penghapusan elemen kini menggunakan tampilan tombol batal bersama. Pegangan ukuran memeriksa batas ukuran, batas kisi, dan elemen tetangga. Pegangan tetap tersedia untuk pengecilan yang diizinkan saat pembesaran terhalang, dengan kursor arah yang menunjukkan gerakan yang tersedia. Percobaan memperbesar ke elemen lain menampilkan kursor tidak tersedia.

## Semua Tepi dan Konfirmasi Simpan

Widget kini dapat diubah ukurannya dari delapan tepi dan sudut di editor utama maupun bersarang. Pengubahan dari kiri dan atas mempertahankan tepi yang berlawanan, mengikuti batas ukuran dan tabrakan, serta menjaga pratinjau sentuh pada titik pegangan. Selesai, pintasan tata letak, dan Atur Ulang menampilkan notifikasi sukses atau gagal melalui satu alur penyimpanan bersama. Kegagalan mempertahankan perubahan untuk dicoba kembali; penyimpanan bersamaan berbagi satu permintaan dan pembatalan halaman mencegah notifikasi terlambat. Kegagalan penyimpanan ditampilkan melalui notifikasi ringkas dalam bahasa antarmuka.

## Kontrak Helper Editor

Modul editor yang dapat digunakan kembali mendokumentasikan ekspor publik, contoh pemanggilan, kontrak masukan/keluaran, dan tanggung jawab pembersihan. Referensi teknis menjelaskan hasil penyimpanan, state editor, dan struktur persistensi per kolom yang sebenarnya dalam keempat bahasa yang didukung.

## Ukuran Ruang Kerja yang Nyaman

Merek dasbor menyediakan ruang untuk ikon dan judul lengkap, kartu sambutan dan login mempertahankan lebar yang mudah dibaca, dan detail akun memakai tinggi bawaan yang ringkas. Composer menerapkan lebar minimum dan maksimum saat baris tersimpan perlu disusun ulang, tanpa menimpa profil tersimpan. Penempatan yang dinormalisasi divalidasi sebelum ditampilkan, sehingga kartu tersimpan di tepi kanan yang melebar disusun ulang di dalam grid yang ditetapkan.

## Pertukaran Widget Tanpa Tabrakan

Editor utama dan bertingkat memvalidasi kedua area tujuan widget secara penuh sebelum pertukaran, termasuk ukuran berbeda, elemen terlihat lainnya, dan batas kisi. Gerakan tetikus, sentuh, dan papan ketik memakai pemeriksaan yang sama; saat dilepas, tata letak terkini divalidasi ulang sebelum posisi mana pun diubah. Pengguliran tepi bertingkat mempertahankan tinggi kisi sementara dan mengukur ulang pratinjau setelah perluasan mengubah posisi gulir elemen induk.

## Binding Waktu Jalan Deskriptif

Validasi nama kini mengurai JavaScript dan TypeScript di semua direktori sumber inti, termasuk gateway, perkakas, pengujian, dan fixture. Pemeriksaan mencakup ekspor, setiap deklarator, destrukturisasi, parameter callback dan metode, properti parameter konstruktor, binding catch, alias impor, serta fungsi dan kelas bernama tanpa bergantung pada format. Binding inti memakai nama lokal deskriptif sementara kunci properti publik dan muatan tetap sama. Pengecualian nama spasial, pengenal, dan penghitung numerik yang didokumentasikan tetap tersedia; kasus detektor khusus mencegah binding terlewat dan laporan keliru. Versi komponen, batas dependensi yang teruji, dan indeks versi terlokalisasi diselaraskan.

## Komit

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
- [fcc204f](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcc204fe09b8fa86814d5f24b5d3839dfbc51c2b)
- [286d397](https://github.com/Cognis-Labs-HQ/Cognis/commit/286d397650ef4e285375d95201a7eee6c70b6528)
- [f038150](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03815014aee59973f68dc3f040c2bf248309f9e)
- [fc698c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc698c84645f30eabbc25306ecf3eccbbb3b8828)
- [ba219ba](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba219ba88b792c7535934b4dd5e78e93ba601777)
- [935c670](https://github.com/Cognis-Labs-HQ/Cognis/commit/935c670f7a9447e83355662c8facfbfd090255fa)
- [244aff5](https://github.com/Cognis-Labs-HQ/Cognis/commit/244aff5f4fca07e76c4c484cec5df292116f7293)
