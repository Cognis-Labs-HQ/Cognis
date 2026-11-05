# Pemulihan Komponen

**Cabang Fitur:** feature-component-recovery

## Isolasi Kegagalan

Katalog peramban menentukan pemilik penyedia dan versi terpasang dari registri host. Komponen opsional yang gagal kehilangan kemampuan parsial, alur, dan pendengarnya, sementara pemilik lain tetap dimuat. Penyegaran eksplisit atau perubahan revisi memungkinkan percobaan ulang. Komponen host wajib mempertahankan perlindungan yang sudah ada. Modul eksternal selalu opsional: manifest modul tidak dapat membuat Cognis gagal tertutup atau menjadi ketergantungan wajib host.

Pengecualian server tak terduga dikaitkan dengan pemilik terdaftar. Kesalahan masukan yang diharapkan dan JSON rusak tidak dihitung. Tiga kegagalan berbeda yang diamati administrator dalam lima menit memicu penonaktifan terautentikasi biasa. Laporan dideduplikasi, dibatasi dalam memori, dan dipisahkan menurut versi terpasang; laporan pengguna biasa tidak dapat menonaktifkan komponen secara global. Penghitung diatur ulang saat server dimulai ulang atau jendela waktu berakhir. Perbaiki atau tingkatkan komponen sebelum mengaktifkannya kembali.

## Operasi Pengelolaan

`component:info`, `component:release-channel get|set|list`, `component:upgrade`, aktivasi, dan penonaktifan mendukung sasaran tunggal maupun `--all`, dengan filter jenis atau gateway adaptor. Alur `component:*` bernama menggunakan kontrak `component:management` versi satu milik API dan rute pengelolaan terautentikasi yang sudah ada. Kontrol host wajib atau terkunci serta pemeriksaan ketergantungan tetap berwenang. Mutasi terserialisasi membaca ulang status setelah memperoleh kunci. Kegagalan katalog adaptor tetap terlihat pada gateway pemilik dan sebagai kegagalan penemuan pada kelompok terkait; pengelolaan komponen sehat dan penonaktifan gateway opsional itu tetap berfungsi. Kegagalan otorisasi tetap menghentikan operasi.

## Kanal Dan Peningkatan

Cabang dan rilis marketplace menyediakan pilihan kanal. Pilihan disimpan secara atomik dalam `config/component-channels.json`. Peningkatan mempertahankan pemeriksaan otorisasi, integritas, pemasang, dan ketergantungan yang ada. Modul yang sebelumnya aktif dinonaktifkan sementara. Pemasangan gagal mencoba pemulihan tervalidasi dengan persetujuan penafian yang diberikan pemanggil; pemasangan yang tidak pasti setelah batas waktu tetap nonaktif. Peningkatan berhasil menyebut kebutuhan memulai ulang. Gateway, adaptor, dan modul inti bawaan ditingkatkan bersama host, tidak memiliki kanal mandiri, dan dilewati dalam peningkatan massal. Perubahan konfigurasi dan impor repositori tetap bersasaran tunggal.

## Identitas Runtime

Penemuan adaptor mempertahankan ID manifest kanonis untuk ketergantungan dan mencatat ID runtime terpisah untuk kepemilikan penyedia. Penyedia Social profile, messages, dan call mempertahankan versi terpasang dan status opsional walaupun ID manifestnya memakai awalan `social-`.

## Keluaran Dan Progres CLI

Semua perintah CLI menampilkan keluaran manusia yang ringkas secara bawaan. Daftar menampilkan paling banyak dua puluh entri; kolom besar dan muatan bertingkat diringkas. Hasil siklus hidup menyebut setiap sasaran, keberhasilan, pelewatan atau kegagalan, versi terpasang, dan kebutuhan memulai ulang. Hasil kosong dinyatakan dengan jelas. Gunakan `-v` atau `--verbose` sebelum atau sesudah nama perintah untuk respons lengkap, termasuk perintah gateway, adaptor, dan modul terdaftar. Tempatkan `--` sebelum argumen literal yang sama dengan opsi global.

`-v` kini berarti keluaran terperinci; gunakan `--version` untuk versi CLI. Skrip membaca respons terstruktur dari stdout. Progres ditulis ke stderr, dimulai saat perintah dijalankan, dan menampilkan waktu berlalu untuk operasi panjang. Peningkatan modul juga mengalirkan status nyata pemilihan, penonaktifan sementara, pemasangan, penantian, pemulihan, dan hasil. Persentase unduhan tidak dikarang. Server lama yang hanya mengembalikan JSON tetap mendukung tampilan waktu berlalu. Aliran terputus menghasilkan kesalahan dan saran memeriksa status komponen sebelum mencoba lagi. Kegagalan kelompok tetap menghasilkan kode keluar bukan nol dalam kedua mode keluaran.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

## Commit

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Isolasi kegagalan komponen dan tambahkan perintah siklus hidup.
