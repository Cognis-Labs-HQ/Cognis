# Pemulihan Komponen

**Cabang Fitur:** feature-component-recovery

## Isolasi Kegagalan

Katalog penyedia browser memuat kepemilikan modul, gateway, atau adaptor yang ditentukan server. Pemilik opsional yang gagal kehilangan seluruh kapabilitas, alur, dan pendengarnya; pemilik lain tetap dimuat dan antarmuka menampilkan notifikasi galat yang diterjemahkan. Katalog yang sama dikarantina sampai penyegaran eksplisit atau perubahan revisi pemilik. Penyedia wajib, kritis, tanpa pemilik yang diketahui, dan kebijakan luring menutup akses saat gagal. Komponen wajib atau kritis dilindungi dari penonaktifan otomatis maupun manual; pengguna komponen yang dilindungi juga mencegah penonaktifan dependensinya.

## Penonaktifan Otomatis

Tiga kegagalan penyedia berbeda yang dilaporkan administrator dalam lima menit memicu operasi penonaktifan terautentikasi yang sudah ada. Laporan dicocokkan dengan registri server terkini, dideduplikasi menurut kejadian, dibatasi dalam memori, dan dipisahkan menurut versi komponen. Laporan pengguna nonadministrator tidak dihitung untuk penonaktifan global. Penghitung direset saat server dimulai ulang atau jendelanya berakhir. Penonaktifan yang berhasil dipersistenkan melalui siklus hidup biasa dan menyegarkan katalog. Perbaiki atau tingkatkan komponen sebelum mengaktifkannya kembali.

## Operasi Baris Perintah

Gunakan perintah berikut dari kontainer Cognis yang berjalan dengan kredensial CLI biasanya. Pemilihan adaptor memakai ID gateway lalu ID adaptor. `--all` dapat dibatasi menurut jenis atau gateway adaptor. Operasi massal mengikuti urutan dependensi, melewati sasaran yang dilindungi atau dikelola host, melanjutkan setelah kegagalan individual, mencetak setiap hasil, dan keluar dengan status galat jika ada sasaran gagal. Pengaktifan dan penonaktifan satu sasaran kini memakai respons daftar hasil yang sama. Pembaruan konfigurasi dan impor repositori tetap dibatasi per sasaran.

## Kanal Dan Peningkatan

Pengambilan, penetapan, dan pencatatan kanal rilis memakai cabang serta rilis dari sumber pasar yang dikonfigurasi. Pilihan disimpan secara atomik dalam `config/component-channels.json`. Peningkatan memakai pilihan itu atau cabang terpasang beserta pemasang, pemeriksaan dependensi, kebijakan integritas, dan otorisasi yang sudah ada. Modul yang sebelumnya aktif dinonaktifkan sementara selama peningkatan. Tugas pemasangan tertunda dipantau sampai selesai; pemasangan gagal mencoba pengaktifan kembali melalui validasi normal. Peningkatan berhasil melaporkan kebutuhan memulai ulang server. Waktu habis membiarkan pekerjaan yang belum pasti tetap nonaktif. Gateway, adaptor, dan modul inti bawaan ditingkatkan melalui penerapan host; daftar kanal mandirinya kosong dan penetapan kanal ditolak.

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
