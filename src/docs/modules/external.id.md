# Modul Eksternal

Modul eksternal memperluas Cognis dengan perilaku server dan browser yang dipasang secara mandiri serta tetap terisolasi di balik kontrak manifes, kapabilitas, alur, rute, integritas, dan siklus hidup.

## Contoh penggunaan

Repositori mendeklarasikan identitas stabil dan titik masuk bootstrap di `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

Bootstrap menyumbangkan perilaku hanya melalui konteks terbatasnya dan mengembalikan pembersihan untuk sumber daya miliknya:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  const remove = ctx.flow.inject('construct-example-page', 'content', {
    id: 'example-module.content',
    handler: async () => ({ ready: true }),
  });
  return () => remove();
}
```

Administrator memasang repositori dari **Modul**, meninjau integritas dan dependensinya, mengaktifkannya secara eksplisit, lalu dapat menonaktifkannya untuk menghapus semua perilaku UI dan backend yang terdaftar tanpa memulai ulang Cognis.

## Spesifikasi teknis

## Identitas stabil

Setiap modul memiliki `id` yang dapat dibaca manusia dan RFC 4122 `uuid`. ID dapat diganti namanya; UUID tidak boleh diubah, berpindah antar produk, atau digunakan kembali. Setiap entri `requires` adalah UUID komponen. Cognis menggunakan UUID untuk keputusan ketergantungan dan siklus hidup serta nama hanya untuk tampilan dan URL.

### Kontrak repositori

Satu repositori Git mengirimkan satu modul. Akarnya berisi `manifest.json`, `package.json`, `routes.json`, dan titik masuk orkestrator opsional `bootstrap.js`, `api/index.js`, `ui/index.js`, dan `cli/index.js`. `bootstrap.js` adalah satu-satunya entri integrasi sistem dan menerima `ctx`; ia dapat mengimpor file apa pun dalam repositorinya, tetapi tidak boleh mengimpor Cognis atau jalur internal komponen lain. Ekspor kemampuan dan tahapan aliran melalui `ctx`. Kontrak titik masuk yang sempit ini memungkinkan penulis dengan bebas mengatur ulang file internal tanpa menggabungkan Cognis ke dalamnya.

`package.json` harus menggunakan `"type": "module"` dan versinya harus sama persis dengan `manifest.json`. `routes.json` selalu ada dan berisi array, termasuk array kosong ketika modul tidak mengklaim rute. Setiap titik masuk yang dinyatakan harus diselesaikan menjadi file biasa di dalam kasir. Pertahankan orkestrasi di titik masuk yang dinyatakan dan tempatkan kode implementasi yang terorganisir secara bebas di belakangnya; Cognis tidak mengimpor jalur modul lainnya.

Setiap modul eksternal mendeklarasikan `entrypoints.bootstrap`. Cognis hanya mengimpor file tersebut dan memanggil `bootstrapModule(ctx)` saat modul diaktifkan. Konteks cakupan menyediakan registrasi rute API, direktori statis modul, rute SPA, navigasi, pengaturan dan ekstensi halaman, kontribusi kemampuan, pembuatan aliran, dan injeksi tahapan. Letakkan dokumentasi yang dilokalkan di bawah `docs/` dan catatan rilis modul di bawah `docs/changelog/`; keduanya ditemukan dari repositori yang diinstal tanpa registrasi jalur inti. Aset browser tetap menjadi milik modul dan hanya diekspos melalui `ctx.registerStaticDir`.

`bootstrapModule` dapat mengembalikan pembuang, dan modul juga dapat mengekspor `teardownModule(ctx)`. Saat menonaktifkan atau mencopot pemasangan, Cognis memanggil kait tersebut dan kemudian menghapus setiap rute, direktori statis, kontribusi UI, kemampuan, aliran yang dibuat, dan tahapan aliran yang disuntikkan yang direkam oleh konteks cakupan. Modul tidak boleh menyimpan pengatur waktu, pendengar, soket, atau pekerjaan lain setelah pembuangannya selesai. Kontribusi yang dibuat dengan mengimpor internal inti atau dengan melewati `ctx` yang disediakan tidak dapat dilacak dan tidak didukung.

Manifes menyatakan `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, `requires` berbasis UUID, `entrypoints`, dan `assets`. Jalur aset bersifat relatif terhadap repositori. `assets.icon` mengidentifikasi ikon toko persegi, `assets.banner` mengidentifikasi pahlawan detail, dan `assets.screenshots` adalah galeri terurut. Jalur harus tetap berada di dalam repositori.

Kunci pelokalan harus menggunakan titik sebagai pemisah kata: tulis `module.example.canvas.label`, bukan `module.example.canvas_label` atau `module.example.canvas-label`. Segmen yang dipisahkan titik menjaga kepemilikan, pencarian, validasi, dan perilaku alat tetap dapat diprediksi. ID modul terdaftar merupakan satu-satunya pengecualian yang disengaja bila ID tetapnya sudah mengandung tanda hubung.

### Sumber dan repositori pribadi

Cognis menyertakan organisasi `https://github.com/Cognis-Labs-HQ` sebagai sumber tepercaya yang tidak dapat diubah secara default. Administrator dapat menambahkan lebih lanjut organisasi GitHub atau grup GitLab dari Modul di menu pengguna, lalu Sumber Modul. Cognis menanyakan API penyedia, memperlakukan setiap repositori yang berisi manifes root yang valid sebagai modul, dan mendapatkan katalog secara dinamis. Sumber dapat mereferensikan PAT opsional yang disimpan dalam keyring administrator yang masuk; catatan sumber hanya menyimpan pengidentifikasi keyring. Gunakan token dengan hak istimewa paling rendah dan hanya baca dengan akses repositori dan metadata. Token diberikan hanya untuk penemuan dan kloning dan tidak pernah ditulis ke konfigurasi sumber. Repositori privat dikecualikan kecuali **Pindai Repositori Privat** diaktifkan; mengaktifkannya membuat PAT wajib.

### Izin PAT GitHub untuk pemindaian privat

Utamakan PAT fine-grained dan konfigurasikan sebagai berikut:

- **Resource owner:** pilih organisasi GitHub untuk sumber modul Cognis.
- **Repository access:** pilih **All repositories** atau setiap repositori privat yang harus ditemukan dan dipasang Cognis.
- **Repository permissions:** atur **Metadata** dan **Contents** ke **Read-only**. Metadata mengizinkan daftar repositori; Contents mengizinkan penemuan manifes dan kloning terautentikasi.
- **Organization permissions:** tidak ada yang diperlukan. Cognis tidak memerlukan **Administration**, **Members**, **Secrets**, atau izin Copilot.
- **Persetujuan dan SSO:** selesaikan persetujuan organisasi dan otorisasi SAML SSO bila diwajibkan kebijakan organisasi.

Untuk personal access token klasik, berikan cakupan `repo` dan otorisasi SSO organisasi bila berlaku. Pemilik token harus sudah dapat mengakses setiap repositori privat yang dipilih. Cognis menolak pengaturan sumber ketika token tidak dapat mencantumkan repositori privat dan membaca isinya.

### Instalasi dan keamanan

Instalasi mengkloning repositori HTTPS yang dipilih tanpa perintah kredensial interaktif, memvalidasi manifes root yang diunduh dan UUID yang tidak dapat diubah, dan memindahkannya secara atom ke bawah root modul eksternal. Sebelum melakukan checkout, Cognis memverifikasi versi paket dan manifes, deklarasi rute, titik masuk, karya seni yang diperlukan, jalur relatif repositori yang aman, dan setiap intisari file SHA-256 yang dinyatakan. Pemeriksaan yang gagal akan menghapus pembayaran sementara dan membiarkan versi yang terinstal tidak tersentuh. Memperbarui mengulangi operasi itu untuk UUID yang sama. Menghapus instalasi akan menghapus checkout UUID tersebut. Pengaktifan tetap merupakan tindakan siklus hidup yang terpisah sehingga kode tidak dieksekusi hanya dengan menjelajahi atau menginstalnya. Rute harus dideklarasikan dalam `routes.json`; awalan inti yang dilindungi tidak dapat diklaim.

Pemilik repositori harus menandatangani rilis, menyematkan dependensi, menerbitkan checksum di `files`, menghindari rahasia yang dihasilkan, dan mendokumentasikan semua kemampuan yang diminta. Tangkapan layar tidak boleh berisi kredensial atau data pribadi. Administrator Cognis tetap bertanggung jawab untuk meninjau kode pihak ketiga sebelum mengaktifkannya.

### Daftar periksa ekstraksi

Sebelum memindahkan modul yang dibundel ke dalam repositorinya sendiri, salin direktori modul tanpa mengubah UUID-nya, pertahankan ID yang dapat dibaca, dan pertahankan root `manifest.json`, `package.json`, dan `routes.json`. Jadikan URL repositori, beranda, dan tautan dukungan mengarah ke proyek baru; tetap menyinkronkan versi manifes dan paket; memastikan setiap titik masuk dan aset yang dinyatakan ada dengan casing nama file yang tepat; meregenerasi nilai `files` SHA-256 setelah perubahan terakhir; dan menjalankan pengujian modul tanpa bergantung pada impor relatif monorepo. Interaksi runtime dengan Cognis dan komponen lainnya harus terjadi hanya melalui kapabilitas dan alur bootstrap `ctx`. Uji siklus aktifkan-nonaktifkan-aktifkan dan hapus instalan sehingga setiap kontribusi terbukti dapat dilepas dan diulang.

### Simpan aset dan tag

Sebuah modul dapat mendeklarasikan `tags` bersama dengan `categories` yang lebih luas; keduanya berpartisipasi dalam penyaringan pasar. Simpan karya seni di akar repositori di bawah `assets/`: sediakan `assets/icon.svg` atau `assets/icon.png` untuk ikon katalog, dan `assets/banner.svg`, `assets/banner.png`, atau `assets/banner.jpg` untuk pahlawan halaman detail. Deklarasikan jalur yang dipilih sebagai `assets.icon` dan `assets.banner` di `manifest.json`. Gambar galeri opsional tercantum di `assets.screenshots`. Jaga karya seni bebas dari rahasia dan data pribadi. Halaman detail modul terpasang memilih `README.<locale>.md` untuk bahasa UI aktif, lalu beralih ke `README.en.md`, `README.md`, dan deskripsi katalog secara berurutan. Alias kompatibilitas `README.md` opsional di akar tidak diwajibkan atau divalidasi checksum-nya; berkas `README.<locale>.md` yang dilokalkan tetap dapat dimasukkan dalam inventaris integritas manifes.

### Preferensi modul

Modul dapat mengekspos pengaturan yang dapat diedit administrator dengan `ui.preferences`. Setiap bidang mendeklarasikan `key` yang stabil, `labelKey` yang dilokalkan, `descriptionKey` opsional, `type` berupa `boolean`, `string`, atau `number`, `default` opsional yang sesuai, tipe `password` untuk string sensitif yang disembunyikan, serta `required: true` bila pengaktifan harus diblokir sampai endpoint konfigurasi milik modul mengembalikan nilai; `ui.stringsBaseUrl` menunjuk terjemahan milik modul. Jika tidak dicantumkan, Cognis menemukan bundel standar `ui/languages/<locale>/strings.xml` secara otomatis. Cognis merender kontrak manifes ini pada tampilan detail modul terpasang, melakukan polling `GET /api/v1/modules/<id>/config`, dan mengirim perubahan dengan `PUT` ke endpoint milik modul yang sama. Modul memvalidasi, menerapkan, dan menyimpan konfigurasi operasionalnya. Modul tidak boleh menyediakan UI pengaturan kedua atau memakai preferensi pengguna Cognis sebagai penyimpanan konfigurasi. Menonaktifkan atau memulai ulang modul harus mempertahankan konfigurasi tersimpan ini; hanya alur penghapusan instalasi yang boleh menghapusnya. Untuk setiap kata sandi tersimpan, respons konfigurasi mengembalikan `<key>Configured: true` alih-alih rahasia; Cognis menampilkan `****`, menganggap bidang wajib terpenuhi, dan mengirim nilai kosong saat masker tidak berubah agar modul mempertahankan kata sandi tersimpan.

### Pencatatan log dan umpan balik pengguna

Kode bootstrap dan rute server menulis log aplikasi terstruktur melalui `ctx.log(level, message, meta)`. Cognis mengaitkan setiap entri dengan modul sebelum meneruskannya ke gateway Logging. Kode browser memperoleh `ui:log`, `ui:showToast`, dan `ui:openErrorPopup` dari `uiCtx.capabilities`; `ui:log` meneruskan entri terautentikasi ke log server, sedangkan kapabilitas umpan balik menggunakan UI host yang bertema dan aksesibel. Modul harus memakai proses ini, bukan hanya keluaran konsol browser untuk kegagalan operasional atau membuat permukaan notifikasinya sendiri.

### Penyegaran kanal rilis dan klien browser

Untuk modul terpasang, penyegaran katalog menyelesaikan cabang atau rilis yang terpasang terlebih dahulu dan hanya memakai cabang bawaan repositori ketika tidak ada kanal yang tercatat. Modul memakai data browser milik gateway melalui klien `uiCtx.capabilities` yang dideklarasikan; klien host saat ini mencakup `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient`, dan `share:uiClient`. Deklarasikan setiap kapabilitas UI yang dibutuhkan agar Cognis memuat penyedia aktifnya sebelum memasang rute modul.

Modul yang menyimpan konfigurasi atau konten di luar checkout harus mengekspor `uninstallModule(ctx, { deleteContent })` dari entrypoint bootstrap yang dideklarasikan. Hook menghapus rekaman dan berkas milik modul hanya ketika `deleteContent` bernilai benar. Cognis memanggilnya saat kapabilitas masih tersedia melalui `ctx.getCapability`. Setelah berhasil, Cognis menghapus konfigurasi modul tersimpan dan checkout; jika gagal, keduanya tetap tersedia agar administrator dapat mencoba lagi.

### Kepemilikan viewport UI

Cognis memiliki shell dasbor dan setiap komponen pakai ulang yang dihasilkan kapabilitas host, termasuk kelas avatar struktural `profile-capability-*`. Modul hanya memiliki turunan yang direndernya di dalam akar konten yang diteruskan ke `mount()`. Setiap selektor modul harus berakhir pada kelas atau ID dengan namespace modul; selektor tema host hanya boleh muncul sebagai leluhur target milik modul tersebut. Modul boleh meneruskan kelas tata letaknya sendiri ke perender host, tetapi tidak boleh menyalin stylesheet host, mendefinisikan ulang kelas kapabilitas host, memilih elemen shell, atau mengubah `document.body` maupun `document.head`. Perilaku seluruh aplikasi harus berada dalam kapabilitas atau flow `uiCtx` yang dideklarasikan dengan hook yang dapat dilepas.

Modul browser memperoleh utilitas host yang dapat digunakan kembali dan CSS umum melalui kapabilitas `ui:reuse`, bukan dengan mengimpor internal host atau menyalin gaya. `importModule(path)` memuat modul produksi apa pun di bawah `src/ui/reuse/`; `loadStylesheet(path)` dan `loadStylesheets(paths)` memuat berkas di bawah `src/ui/styles/reuse/`; sedangkan `loadCommonStyles()` memuat seluruh katalog `stylesheets` yang tidak dapat diubah. `moduleUrl(path)` dan `stylesheetUrl(path)` tersedia ketika kapabilitas host lain menerima URL. Path harus relatif, menggunakan ekstensi yang diharapkan, serta tidak boleh melintasi direktori atau memilih berkas pengujian.

```js
const reuse = uiCtx.capabilities.get("ui:reuse");
const { createPageComposer } = await reuse.importModule(
    "page-composer/index.js",
);
await reuse.loadStylesheets(["layout.css", "page-sections.css"]);
```

Modul yang harus memuat skrip runtime mendeklarasikan `ui:resourceLoader` dan memanggil metode tervalidasi serta terhitung referensi `loadScript({ id, src, globalName })`. Modul harus membuang pegangan yang dikembalikan saat dilepas dan tidak boleh menambahkan skrip langsung ke dokumen.

## Dependensi instalasi

Manifes eksternal dapat menyatakan `hardDependencies` dan `softDependencies` sebagai daftar UUID atau ID modul. Dependensi keras tidak dianjurkan karena administrator harus memasang dan mengaktifkannya sebelum instalasi dapat dilanjutkan. Dependensi lunak dapat dipilih secara opsional pada dialog instalasi.
