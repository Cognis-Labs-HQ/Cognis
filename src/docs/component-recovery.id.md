# Pemulihan Komponen

## Isolasi Kegagalan

Katalog penyedia browser memuat kepemilikan modul, gateway, atau adaptor yang ditentukan server. Pemilik opsional yang gagal kehilangan seluruh kapabilitas, alur, dan pendengarnya; pemilik lain tetap dimuat dan antarmuka menampilkan notifikasi galat yang diterjemahkan. Katalog yang sama dikarantina sampai penyegaran eksplisit atau perubahan revisi pemilik. Penyedia wajib, kritis, tanpa pemilik yang diketahui, dan kebijakan luring menutup akses saat gagal. Komponen wajib atau kritis dilindungi dari penonaktifan otomatis maupun manual; pengguna komponen yang dilindungi juga mencegah penonaktifan dependensinya.

Pengecualian rute server yang tidak terduga dikaitkan dengan batas gateway, adaptor, atau modul yang mendaftarkannya. Galat klien yang diharapkan dan JSON rusak tidak dihitung dalam anggaran kegagalan. Kegagalan server yang diamati administrator memakai perlindungan kegagalan berulang yang sama; data permintaan tidak dapat memilih pemilik lain. Respons komponen lain tetap berjalan normal.

## Penonaktifan Otomatis

Tiga kegagalan penyedia berbeda yang dilaporkan administrator dalam lima menit memicu operasi penonaktifan terautentikasi yang sudah ada. Laporan dicocokkan dengan registri server terkini, dideduplikasi menurut kejadian, dibatasi dalam memori, dan dipisahkan menurut versi komponen. Laporan pengguna nonadministrator tidak dihitung untuk penonaktifan global. Penghitung direset saat server dimulai ulang atau jendelanya berakhir. Penonaktifan yang berhasil dipersistenkan melalui siklus hidup biasa dan menyegarkan katalog. Perbaiki atau tingkatkan komponen sebelum mengaktifkannya kembali.

## Operasi Baris Perintah

Gunakan perintah berikut dari kontainer Cognis yang berjalan dengan kredensial CLI biasanya. Pemilihan adaptor memakai ID gateway lalu ID adaptor. `--all` dapat dibatasi menurut jenis atau gateway adaptor. Operasi massal mengikuti urutan dependensi, melewati sasaran yang dilindungi atau dikelola host, melanjutkan setelah kegagalan individual, mencetak setiap hasil, dan keluar dengan status galat jika ada sasaran gagal. Pengaktifan dan penonaktifan satu sasaran kini memakai respons daftar hasil yang sama. Pembaruan konfigurasi dan impor repositori tetap dibatasi per sasaran.

```sh
cognisctl component:info module study-language-en
cognisctl component:info --all
cognisctl component:release-channel list module study-language-en
cognisctl component:release-channel set module study-language-en feature-guided-tutorials
cognisctl component:release-channel get module study-language-en
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all
cognisctl component:disable module --all
cognisctl component:enable adapter study --all
```

## Kanal Dan Peningkatan

Pengambilan, penetapan, dan pencatatan kanal rilis memakai cabang serta rilis dari sumber pasar yang dikonfigurasi. Pilihan disimpan secara atomik dalam `config/component-channels.json`. Peningkatan memakai pilihan itu atau cabang terpasang beserta pemasang, pemeriksaan dependensi, kebijakan integritas, dan otorisasi yang sudah ada. Modul yang sebelumnya aktif dinonaktifkan sementara selama peningkatan. Tugas pemasangan tertunda dipantau sampai selesai; pemasangan gagal mencoba pengaktifan kembali melalui validasi normal. Peningkatan berhasil melaporkan kebutuhan memulai ulang server. Waktu habis membiarkan pekerjaan yang belum pasti tetap nonaktif. Gateway, adaptor, dan modul inti bawaan ditingkatkan melalui penerapan host; daftar kanal mandirinya kosong dan penetapan kanal ditolak.

## Kontrak Publik

Kontrak `component:management` versi satu dimiliki komponen API dan diterbitkan melalui `system:contracts`. Inspeksi, pilihan rilis, mutasi, dan laporan kegagalan menjalankan alur `component:*` bernama. `/api/v1/components` dan operasi pengelolaannya memerlukan otorisasi administrator; pengguna terautentikasi dapat melaporkan kegagalan penyedia terdaftar, tetapi tidak dapat memakai laporan itu untuk menonaktifkan komponen secara global. Tindakan domain tetap melewati rute pengelolaan terautentikasi semula. Metadata penyedia mencakup kepemilikan kanonis, versi, serta perlindungan wajib atau kritis, termasuk aset dengan hash konten.
