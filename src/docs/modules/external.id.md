# Modul Eksternal

## Identitas stabil

Setiap modul memiliki `id` yang dapat dibaca manusia dan RFC 4122 `uuid`. ID dapat diganti namanya; UUID tidak boleh diubah, berpindah antar produk, atau digunakan kembali. Setiap entri `requires` adalah UUID komponen. Cognis menggunakan UUID untuk keputusan ketergantungan dan siklus hidup serta nama hanya untuk tampilan dan URL.

## Kontrak repositori

Satu repositori Git mengirimkan satu modul. Akarnya berisi `manifest.json`, `package.json`, `routes.json`, dan titik masuk orkestrator opsional `bootstrap.js`, `api/index.js`, `ui/index.js`, dan `cli/index.js`. `bootstrap.js` adalah satu-satunya entri integrasi sistem dan menerima `ctx`; ia dapat mengimpor file apa pun dalam repositorinya, tetapi tidak boleh mengimpor Cognis atau jalur internal komponen lain. Ekspor kemampuan dan tahapan aliran melalui `ctx`. Kontrak titik masuk yang sempit ini memungkinkan penulis dengan bebas mengatur ulang file internal tanpa menggabungkan Cognis ke dalamnya.

`package.json` harus menggunakan `"type": "module"` dan versinya harus sama persis dengan `manifest.json`. `routes.json` selalu ada dan berisi array, termasuk array kosong ketika modul tidak mengklaim rute. Setiap titik masuk yang dinyatakan harus diselesaikan menjadi file biasa di dalam kasir. Pertahankan orkestrasi di titik masuk yang dinyatakan dan tempatkan kode implementasi yang terorganisir secara bebas di belakangnya; Cognis tidak mengimpor jalur modul lainnya.

Setiap modul eksternal mendeklarasikan `entrypoints.bootstrap`. Cognis hanya mengimpor file tersebut dan memanggil `bootstrapModule(ctx)` saat modul diaktifkan. Konteks cakupan menyediakan registrasi rute API, direktori statis modul, rute SPA, navigasi, pengaturan dan ekstensi halaman, kontribusi kemampuan, pembuatan aliran, dan injeksi tahapan. Letakkan dokumentasi yang dilokalkan di bawah `docs/` dan catatan rilis modul di bawah `docs/changelog/`; keduanya ditemukan dari repositori yang diinstal tanpa registrasi jalur inti. Aset browser tetap menjadi milik modul dan hanya diekspos melalui `ctx.registerStaticDir`.

`bootstrapModule` dapat mengembalikan pembuang, dan modul juga dapat mengekspor `teardownModule(ctx)`. Saat menonaktifkan atau mencopot pemasangan, Cognis memanggil kait tersebut dan kemudian menghapus setiap rute, direktori statis, kontribusi UI, kemampuan, aliran yang dibuat, dan tahapan aliran yang disuntikkan yang direkam oleh konteks cakupan. Modul tidak boleh menyimpan pengatur waktu, pendengar, soket, atau pekerjaan lain setelah pembuangannya selesai. Kontribusi yang dibuat dengan mengimpor internal inti atau dengan melewati `ctx` yang disediakan tidak dapat dilacak dan tidak didukung.

Manifes menyatakan `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, `requires` berbasis UUID, `entrypoints`, dan `assets`. Jalur aset bersifat relatif terhadap repositori. `assets.icon` mengidentifikasi ikon toko persegi, `assets.banner` mengidentifikasi pahlawan detail, dan `assets.screenshots` adalah galeri terurut. Jalur harus tetap berada di dalam repositori.

## Sumber dan repositori pribadi

Cognis menyertakan organisasi `https://github.com/Cognis-Labs-HQ` sebagai sumber tepercaya yang tidak dapat diubah secara default. Administrator dapat menambahkan lebih lanjut organisasi GitHub atau grup GitLab dari Modul di menu pengguna, lalu Sumber Modul. Cognis menanyakan API penyedia, memperlakukan setiap repositori yang berisi manifes root yang valid sebagai modul, dan mendapatkan katalog secara dinamis. Sumber dapat mereferensikan PAT opsional yang disimpan dalam keyring administrator yang masuk; catatan sumber hanya menyimpan pengidentifikasi keyring. Gunakan token dengan hak istimewa paling rendah dan hanya baca dengan akses repositori dan metadata. Token diberikan hanya untuk penemuan dan kloning dan tidak pernah ditulis ke konfigurasi sumber.

## Instalasi dan keamanan

Instalasi mengkloning repositori HTTPS yang dipilih tanpa perintah kredensial interaktif, memvalidasi manifes root yang diunduh dan UUID yang tidak dapat diubah, dan memindahkannya secara atom ke bawah root modul eksternal. Sebelum melakukan checkout, Cognis memverifikasi versi paket dan manifes, deklarasi rute, titik masuk, karya seni yang diperlukan, jalur relatif repositori yang aman, dan setiap intisari file SHA-256 yang dinyatakan. Pemeriksaan yang gagal akan menghapus pembayaran sementara dan membiarkan versi yang terinstal tidak tersentuh. Memperbarui mengulangi operasi itu untuk UUID yang sama. Menghapus instalasi akan menghapus checkout UUID tersebut. Pengaktifan tetap merupakan tindakan siklus hidup yang terpisah sehingga kode tidak dieksekusi hanya dengan menjelajahi atau menginstalnya. Rute harus dideklarasikan dalam `routes.json`; awalan inti yang dilindungi tidak dapat diklaim.

Pemilik repositori harus menandatangani rilis, menyematkan dependensi, menerbitkan checksum di `files`, menghindari rahasia yang dihasilkan, dan mendokumentasikan semua kemampuan yang diminta. Tangkapan layar tidak boleh berisi kredensial atau data pribadi. Administrator Cognis tetap bertanggung jawab untuk meninjau kode pihak ketiga sebelum mengaktifkannya.

## Daftar periksa ekstraksi

Sebelum memindahkan modul yang dibundel ke dalam repositorinya sendiri, salin direktori modul tanpa mengubah UUID-nya, pertahankan ID yang dapat dibaca, dan pertahankan root `manifest.json`, `package.json`, dan `routes.json`. Jadikan URL repositori, beranda, dan tautan dukungan mengarah ke proyek baru; tetap menyinkronkan versi manifes dan paket; memastikan setiap titik masuk dan aset yang dinyatakan ada dengan casing nama file yang tepat; meregenerasi nilai `files` SHA-256 setelah perubahan terakhir; dan menjalankan pengujian modul tanpa bergantung pada impor relatif monorepo. Interaksi runtime dengan Cognis dan komponen lainnya harus terjadi hanya melalui kapabilitas dan alur bootstrap `ctx`. Uji siklus aktifkan-nonaktifkan-aktifkan dan hapus instalan sehingga setiap kontribusi terbukti dapat dilepas dan diulang.

## Simpan aset dan tag

Sebuah modul dapat mendeklarasikan `tags` bersama dengan `categories` yang lebih luas; keduanya berpartisipasi dalam penyaringan pasar. Simpan karya seni di akar repositori di bawah `assets/`: sediakan `assets/icon.svg` atau `assets/icon.png` untuk ikon katalog, dan `assets/banner.svg`, `assets/banner.png`, atau `assets/banner.jpg` untuk pahlawan halaman detail. Deklarasikan jalur yang dipilih sebagai `assets.icon` dan `assets.banner` di `manifest.json`. Gambar galeri opsional tercantum di `assets.screenshots`. Jaga karya seni bebas dari rahasia dan data pribadi.

## Preferensi modul

Modul dapat mengekspos pengaturan yang dapat diedit administrator dengan `ui.preferences`. Setiap bidang mendeklarasikan `key` yang stabil, `labelKey` yang dilokalkan, `descriptionKey` opsional, `type` berupa `boolean`, `string`, atau `number`, serta `default` opsional yang sesuai; `ui.stringsBaseUrl` menunjuk terjemahan milik modul. Cognis merender kontrak manifes ini pada tampilan detail modul terpasang, melakukan polling `GET /api/v1/modules/<id>/config`, dan mengirim perubahan dengan `PUT` ke endpoint milik modul yang sama. Modul memvalidasi, menerapkan, dan menyimpan konfigurasi operasionalnya. Modul tidak boleh menyediakan UI pengaturan kedua atau memakai preferensi pengguna Cognis sebagai penyimpanan konfigurasi.

## Pencatatan log dan umpan balik pengguna

Kode bootstrap dan rute server menulis log aplikasi terstruktur melalui `ctx.log(level, message, meta)`. Cognis mengaitkan setiap entri dengan modul sebelum meneruskannya ke gateway Logging. Kode browser memperoleh `ui:log`, `ui:showToast`, dan `ui:openErrorPopup` dari `uiCtx.capabilities`; `ui:log` meneruskan entri terautentikasi ke log server, sedangkan kapabilitas umpan balik menggunakan UI host yang bertema dan aksesibel. Modul harus memakai proses ini, bukan hanya keluaran konsol browser untuk kegagalan operasional atau membuat permukaan notifikasinya sendiri.

## Penyegaran kanal rilis dan klien browser

Untuk modul terpasang, penyegaran katalog menyelesaikan cabang atau rilis yang terpasang terlebih dahulu dan hanya memakai cabang bawaan repositori ketika tidak ada kanal yang tercatat. Modul memakai data browser milik gateway melalui klien `uiCtx.capabilities` yang dideklarasikan; klien host saat ini mencakup `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient`, dan `share:uiClient`. Deklarasikan setiap kapabilitas UI yang dibutuhkan agar Cognis memuat penyedia aktifnya sebelum memasang rute modul.
