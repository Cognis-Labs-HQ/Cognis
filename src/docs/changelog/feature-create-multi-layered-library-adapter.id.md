# Pustaka Studi Terpadu

**Cabang Fitur:** feature-create-multi-layered-library-adapter

## Lapisan yang dapat dilacak

Adaptor Pustaka Studi menambahkan lapisan tetap untuk sistem tulisan, definisi, materi bahasa, latihan, rangkaian latihan, rutinitas, dan koleksi. Referensi terarah menghubungkan setiap materi dengan unsur pembentuknya.

## Cakupan yang aman

Cakupan global, kelas, dan pengguna privat memiliki kontrol akses berdasarkan peran dan keanggotaan. Permintaan publikasi memerlukan persetujuan tujuan dan menyalin semua dependensi terkait bersama-sama.

## Impor, ekspor, dan UI

Pustaka tersedia melalui ctx dan API terautentikasi, termasuk impor JSON global tervalidasi, ekspor JSON dan Anki, penguraian kata Unicode, penelusuran mendalam, serta halaman Study untuk semua pengguna.

## Templat yang dapat dipilih

Modul bahasa dan aktivitas dapat menyalin hanya lapisan templat baku yang diperlukan. Metadata tautan antarlapisan mempertahankan hubungan yang sah, menandai ketergantungan wajib, serta menyimpulkan tautan karakter ke kata dan kata ke kalimat.

## Tetapkan desain ulang kerangka relasi

Menambahkan rencana implementasi bertahap untuk mengganti lapisan Pustaka tetap dengan skema milik konsumen, relasi generik yang ditegakkan, flow resolusi dan lookup yang dapat dipasang, UI detail entri lengkap, deep link, serta migrasi yang dapat dipulihkan.

## Jalankan desain ulang

Lapisan tetap diganti dengan skema konsumen berversi yang disimpan. Bidang bertipe, kardinalitas, edge berurutan, versi skema, dan target relasi yang terlihat kini ditegakkan. Resolusi grafem Unicode dan penyedia lookup yang dapat dilepas serta mencatat asal data juga ditambahkan.

## Telusuri relasi sepenuhnya

API netral untuk skema, detail, penelusuran, resolusi, dan lookup serta UI berbasis skema kini menampilkan lapisan apa pun, bidang, komponen, dan penggunaan masuk melalui URL detail yang aman dimuat ulang.

## Perubahan capability inkompatibel

Kapabilitas skema yang inkompatibel diperkenalkan pada adapter 2.0.0; ingesti paket deklaratif menaikkannya ke 2.1.0. Konsumen harus mendaftarkan skema dan memakai ID skema serta relasinya sebagai pengganti katalog tetap, kloning templat, dan metode impor atau ekspor khusus lapisan yang telah dihapus.

## Tambahkan paket bahasa deklaratif

Paket bahasa kini dapat menyerahkan direktori khusus data kepada kapabilitas Pustaka untuk diperiksa secara deterministik dan diingesti secara atomik. Cognis memvalidasi keamanan jalur, manifes, lisensi, skema, seluruh rekaman dan relasi, membuat ID bernamespace yang stabil, serta menyimpan tanda terima instalasi berversi. Kerangka bahasa sekarang mendokumentasikan manifes, skema, direktori lapisan, berkas rekaman, dan pemisahan dari adapter resolver atau lookup yang dapat dieksekusi.

## Rekaman definisi terlokal

Lapisan definisi kini mendeklarasikan pemetaan kunci string milik modul. Formulir pembuatan Pustaka meminta setiap bahasa antarmuka Cognis dengan hanya bahasa Inggris yang wajib, menghasilkan kunci stabil yang terikat ke ID entri definisi, dan menyediakan kapabilitas penerjemahan ctx opsional bagi penyedia mendatang.

## Matangkan penjelajah Perpustakaan

Perpustakaan kini menggunakan tab lapisan, entri berbentuk kartu, dan detail melalui popup pakai ulang. Pemilihan entri dan penelusuran relasi kini dikelola di balik layar tanpa menampilkan pengenal rekaman pada URL peramban, sedangkan kontrol sebelumnya dan berikutnya memakai navigasi berarah dengan lebar yang sama. Subnavigasi Belajar juga memberi setiap kontrol ruang yang cukup agar tidak terpotong saat disorot.

## Commit

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
- [8d2b4358](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2b4358c176a447bb60e9248f40c1234f8cb143)
