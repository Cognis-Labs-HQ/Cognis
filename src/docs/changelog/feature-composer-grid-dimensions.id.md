# Ukuran Grid Composer

**Cabang Fitur:** feature-composer-grid-dimensions

## Lebar Penuh yang Konsisten

Deklarasi array lebar penuh kini menggunakan semua kolom yang tersedia pada composer utama dan bersarang, termasuk tata letak formulir masuk dan pendaftaran. Batas tinggi numerik dan pengisian tinggi tetap bekerja secara terpisah.

## Seret Melewati Grid

Menyeret widget ke bawah grid saat ini memperluas konten, lapisan grid, dan bayangan target peletakan secara bersamaan. Area baru tetap tersedia sampai widget dilepas.

## Pratinjau Akurat dan Ruang untuk Kontrol

Pratinjau seret dan pegangan pengubahan ukuran kini menggunakan ukuran yang sama dengan kartu yang dirender, termasuk jarak dan penempatan setengah kisi. Pengukuran editor memperhitungkan inset konten dan bilah gulir. Panel Elemen menggunakan lebar yang tersedia agar label tindakannya tetap terbaca di desktop, tablet, dan ponsel. Posisi panel memakai lebar yang diukur setelah batas tinggi diterapkan, termasuk bilah gulir internal. Pratinjau kuning menunjukkan tujuan penempatan ke atas yang sah sebelum penunjuk dilepas. Pelepasan langsung menerapkan tujuan tersebut selagi editor tetap terbuka, dan penempatan tidak melompati kartu lain yang terisi.

## Penyuntingan Sentuh Stabil

Widget mempertahankan titik pegangan alih-alih melompat ke bawah penunjuk. Editor utama dan bersarang mendukung pengguliran tepi, pembatalan penunjuk, dan sasaran pengubahan ukuran untuk layar sentuh. Panel Elemen menyesuaikan ukuran dengan isinya dan dapat diperkecil menjadi judul saja. Saat menyimpan, editor tetap aktif sampai penyimpanan berhasil, termasuk ketika ukuran viewport berubah.

## Kontrol Ukuran yang Akurat

Penghapusan elemen kini menggunakan tampilan tombol batal bersama. Pegangan ukuran memeriksa batas ukuran, batas kisi, dan elemen tetangga. Pegangan tetap tersedia untuk pengecilan yang diizinkan saat pembesaran terhalang, dengan kursor arah yang menunjukkan gerakan yang tersedia. Percobaan memperbesar ke elemen lain menampilkan kursor tidak tersedia. Percobaan melewati batas minimum, maksimum, atau titik awal kisi mengubah pratinjau menjadi oranye. Gerakan horizontal, vertikal, dan sudut melaporkan pelampauan batas secara independen sementara ukuran kandidat tetap dibatasi.

## Semua Tepi dan Konfirmasi Simpan

Widget kini dapat diubah ukurannya dari delapan tepi dan sudut di editor utama maupun bersarang. Pengubahan dari kiri dan atas mempertahankan tepi yang berlawanan, mengikuti batas ukuran dan tabrakan, serta menjaga pratinjau sentuh pada titik pegangan. Selesai, pintasan tata letak, dan Atur Ulang menampilkan notifikasi sukses atau gagal melalui satu alur penyimpanan bersama. Kegagalan mempertahankan perubahan untuk dicoba kembali; penyimpanan bersamaan berbagi satu permintaan dan pembatalan halaman mencegah notifikasi terlambat. Kegagalan penyimpanan ditampilkan melalui notifikasi ringkas dalam bahasa antarmuka.

## Kontrak Helper Editor

Modul editor yang dapat digunakan kembali mendokumentasikan ekspor publik, contoh pemanggilan, kontrak masukan/keluaran, dan tanggung jawab pembersihan. Referensi teknis menjelaskan hasil penyimpanan, state editor, dan struktur persistensi per kolom yang sebenarnya dalam keempat bahasa yang didukung.

## Ukuran Ruang Kerja yang Nyaman

Merek dasbor menyediakan ruang untuk ikon dan judul lengkap, kartu sambutan dan login mempertahankan lebar yang mudah dibaca, dan detail akun memakai tinggi bawaan yang ringkas. Composer menerapkan lebar minimum dan maksimum saat baris tersimpan perlu disusun ulang, tanpa menimpa profil tersimpan. Penempatan yang dinormalisasi divalidasi sebelum ditampilkan, sehingga kartu tersimpan di tepi kanan yang melebar disusun ulang di dalam grid yang ditetapkan. Lebar, tinggi, dan celah eksplisit yang disimpan dipertahankan pada kisi utama dan bersarang untuk profil kolomnya. Selesai menyimpan geometri yang ditampilkan tanpa pemadatan atau pembagian ulang lebar di akhir. Ruang bilah gulir yang stabil menjaga pemilihan kolom tetap konsisten antara penyuntingan dan tampilan.

## Pertukaran Widget Tanpa Tabrakan

Editor utama dan bersarang mempertahankan ukuran kedua widget saat bertukar. Pertukaran horizontal mempertahankan tepi luar pasangan dan jarak di antaranya sehingga elemen bersebelahan dengan tinggi sama dan lebar berbeda dapat bertukar ke kedua arah. Tinggi berbeda diperbolehkan jika kedua tujuan utuh bebas dari elemen terlihat lainnya, termasuk tetangga vertikal. Pemeriksaan persegi panjang bergantung pada jumlah penempatan, bukan luas grid yang terisi. Kedua tujuan diperiksa terhadap tumpang tindih satu sama lain dan batas grid; pelepasan memvalidasi ulang geometri terkini sebelum mengubah posisi mana pun. Garis tujuan bertema yang sama berwarna hijau untuk pertukaran sah dan merah jika terhalang. Mouse, sentuhan, dan papan ketik memakai model bersama. Pengguliran tepi bersarang mempertahankan tinggi grid sementara dan mengukur ulang pratinjau setelah pertumbuhan mengubah guliran leluhur.

## Binding Waktu Jalan Deskriptif

Validasi nama berbasis pohon sintaks memeriksa deklarasi, ekspor, destrukturisasi, parameter waktu jalan dan tanda tangan tipe, properti parameter konstruktor, binding catch, impor, fungsi dan kelas bernama, binding enum dan namespace waktu jalan, serta anggota privat tanpa bergantung pada format. Pemindaian mencakup sumber, perkakas, pengujian, dan fixture tanpa pengecualian berkas atau daftar pelanggaran lama. Singkatan tidak jelas, bentuk jamak yang disingkat, pengganti bernomor, dan penggunaan binding yang diabaikan menggagalkan validasi. Istilah lazim seperti `args`, `db`, LDAP `dn`, HTTP `req`/`res`, `env`, `opts`, dan `params` tetap sah; glosarium menentukan kosakata lengkap. Pengecualian pendek lainnya adalah `_` yang tidak digunakan dan tidak diekspor, `id`, serta penghitung numerik `i`/`j`/`k` dengan pembaruan aritmetika yang sesuai. Koordinat dan ukuran memakai nama lokal deskriptif. API helper dan penyimpanan milik komponen memakai nama deskriptif langsung pada deklarasi, ekspor, impor, dan pemanggil; alias impor/ekspor yang hanya mengganti nama menggagalkan validasi. Konsumen harus memakai ekspor kanonis, bukan alias singkat. Kunci muatan publik, pengenal kapabilitas, dan identitas khusus tipe mempertahankan peran kontraknya. Manual teknis terlokalisasi, petunjuk kontribusi, versi komponen, batas dependensi, berkas kunci, dan indeks versi diselaraskan.

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
- [edb18fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/edb18fe66f9a1862b646b5139448c6b2808b5414)
- [6769fc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/6769fc72c6ee94e2aa5d7972e755499abde402ed)
- [62bba8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/62bba8d9866310444eca76beb41585951f44e34a)
- [310f0eb](https://github.com/Cognis-Labs-HQ/Cognis/commit/310f0eb513d74910fbb076d37b1aa8e2dbe12f3c)
- [0afbb90](https://github.com/Cognis-Labs-HQ/Cognis/commit/0afbb90055f7b2c8d2689fb3d6b0664e92e6fb91)
