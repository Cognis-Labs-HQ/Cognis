# Navigasi Kartu Anak Stabil

**Cabang Fitur:** work

## Posisi Kartu Anak Stabil

Kartu anak mempertahankan posisi yang telah disesuaikan saat cabang yang lebih dalam dibuka. Turunan baru ditempatkan berdasarkan kedalaman pada slot bebas yang terlihat dengan jarak antartabrakan, sehingga kartu dan konektor tidak melompat atau bertumpang tindih.

## Navigasi Penunjuk Andal

Rute diagonal kini memiliki koridor sasaran berkelanjutan yang lebih besar, perubahan cabang memakai jeda singkat untuk mengenali niat penunjuk, dan kartu aktif tidak lagi berdenyut. Urutan arah alternatif juga menjaga tata letak awal kartu anak tetap rapat di sekitar sumbu pilihan.

## Karosel Komposisi Terpadu

Input dan pelafalan kini memakai input token serta perenderan karosel yang sama dan dapat digunakan kembali. Karosel input berada tepat di bawah bidangnya, token terpilih memakai tombol hapus ringkas yang sama, dan kontrol pembuatan dependensi hanya tampil untuk lapisan yang biasanya dapat dibuat pengguna.

## Komposisi Dependensi Langsung

Kartu yang dibuat melalui kontrol tambah carousel kini kembali melalui alur pemilihan yang sama seperti kartu yang sudah ada, sehingga langsung ditambahkan ke tahap aktif. Bidang pelafalan karakter alternatif kini menyertakan carousel karakter atomiknya meskipun relasi penyedia menggunakan peran presentasi yang lebih umum.

## Pencarian Guratan dan Validasi Terpandu

Composer yang mendukung guratan kini menempatkan tindakan pencarian berbasis bidang di bawah judul khusus Pola Guratan dan menggambar data yang dimuat dalam pratinjau ringkas. Validasi relasi wajib kini menandai tab yang terdampak, membuka tab dengan bidang tidak valid paling awal, lalu memfokuskan bidang atau tindakan definisi yang perlu diperbaiki.

## Detail Judul Popup Selaras

Definisi popup tidak lagi memakai awalan tanda pisah panjang. Kelompok pelafalan dan definisi kini berbagi baris judul utama dan disejajarkan secara vertikal dengan judul kartu.

## Persyaratan Composer Akurat

Persyaratan definisi kini menandai tab Definisi dan tindakan tambah, sedangkan bidang pelafalan yang tidak valid menandai dirinya langsung. Tab mempertahankan warna normal dan hanya menampilkan tanda bintang merah. Karakter alternatif boleh tanpa definisi dan kini memuat semua relasi pelafalan non-definisi. Penyedia pencarian guratan dan kamus mendeklarasikan kapabilitas netral untuk penempatan yang tepat serta pilihan keluar kamus per lapisan. Tag kini tampil terakhir pada formulir Konten.

## Validasi Formulir Bertab Pakai Ulang

Validasi multi-tab Library kini menggunakan pengontrol validasi tab milik composer formulir bersama, bukan implementasi khusus adapter. Pengontrol pakai ulang mengelola aktivasi tab, penanda tidak valid, dan fokus ke bidang tidak valid pertama; Library hanya menyediakan target fokus khusus definisi dan kelas gayanya.

## Perutean Composer Karakter Alternatif

Composer karakter alternatif kini mempertahankan karusel pelafalan karakter yang dinyatakan penyedia dan hanya menggunakan relasi karakter atomik sebagai cadangan, sehingga kartu kosakata tidak lagi muncul di bawah Pelafalan. Penyedia pola guratan diklasifikasikan melalui metadata kontrak netral atau label bidang yang dilokalkan, sehingga aksinya dipindahkan dari baris pencarian umum dan ditampilkan sebagai “Cari” di dalam Pola Guratan.

## Pembatasan Pelafalan Karakter Alternatif

Carousel pelafalan karakter alternatif kini ditentukan hanya dari relasi yang menargetkan unit tulisan atomik. Daftar carousel konstruktor tetap menjadi referensi payload formulir dan tidak lagi dapat memunculkan carousel kosakata dalam editor pelafalan karakter alternatif.

## Pemulihan Tampilan Library dan Carousel Karakter

Tampilan Kata Kerja dan Kata Keterangan yang dideklarasikan penyedia kini diselesaikan melalui rute SPA lapisan Library, bukan menghasilkan 404. Composer karakter alternatif kini mengisi pelafalan dari lapisan karakter atomik di seluruh skema dan menghilangkan relasi kosakata yang tidak terkait sambil tetap mempertahankan definisi.

## Penyelarasan Payload Karakter Alternatif

Payload formulir karakter alternatif kini menyalin daftar carousel pelafalannya langsung dari payload formulir kosakata pada skema yang sama. Kode inferensi dan penyaringan carousel khusus karakter alternatif sebelumnya telah dihapus.

## Commit

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
- [9c77e48f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c77e48f)
- [41d895c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/41d895c6)
- [e5f1dd4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e5f1dd4b)
- [ed27aee1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed27aee1)
- [ac06311e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac06311e)
- [517d09f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/517d09f0)
- [38faf70c](https://github.com/Cognis-Labs-HQ/Cognis/commit/38faf70c)
- [12a11fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/12a11fa8)
- [fc7e7054](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc7e7054)
- [28161864](https://github.com/Cognis-Labs-HQ/Cognis/commit/28161864)
