# Modul Eksternal

Bootstrap modul eksternal memiliki batas waktu bawaan dua menit agar impor paket konten tervalidasi selesai sebelum kapabilitas dipublikasikan. Pengaturan batas waktu eksplisit dari host tetap berlaku. Kegagalan dan habisnya waktu menghapus kontribusi terdaftar serta menjaga modul tetap tidak tersedia. Audio bawaan menggunakan kembali rekaman berversi yang tersimpan saat aktivasi ulang, dan membuat ulang berkas yang hilang melalui gateway Files. Rekonsiliasi catatan dan relasi pustaka tetap berjalan, termasuk untuk paket yang tidak berubah.

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
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

Administrator memasang repositori dari **Modul**, meninjau integritas dan dependensinya, mengaktifkannya secara eksplisit, lalu dapat menonaktifkannya untuk menghapus semua perilaku UI dan backend yang terdaftar tanpa memulai ulang Cognis.

## Spesifikasi teknis

## Identitas stabil

Setiap modul memiliki `id` yang dapat dibaca manusia dan RFC 4122 `uuid`. ID dapat diganti namanya; UUID tidak boleh diubah, berpindah antar produk, atau digunakan kembali. Setiap entri `requires` adalah UUID komponen. Cognis menggunakan UUID untuk keputusan ketergantungan dan siklus hidup serta nama hanya untuk tampilan dan URL.

### Kontrak repositori

Satu repositori Git mengirimkan satu modul. Akarnya berisi `manifest.json`, `package.json`, `routes.json`, dan titik masuk wajib `bootstrap.js` serta titik masuk opsional `api/index.js`, `ui/index.js`, dan `cli/index.js`. `bootstrap.js` adalah satu-satunya entri integrasi sistem dan menerima `ctx`; berkas ini hanya boleh mengimpor berkas dalam repositorinya; perilaku host dan komponen lain diperoleh melalui kapabilitas ctx dan alur. Kapabilitas dan tahap alur yang diekspor wajib menggunakan `ctx` agar pembersihan siklus hidup dapat melacaknya. Pendaftaran sensitif terhadap keamanan tetap dibatasi dan memerlukan `privileged: true`; impor biasa, URL API, dan kelas gaya bersama tidak membuat modul berprivilege.

`package.json` harus menggunakan `"type": "module"` dan versinya harus sama persis dengan `manifest.json`. `routes.json` selalu ada dan berisi array, termasuk array kosong ketika modul tidak mengklaim rute. Setiap titik masuk yang dinyatakan harus diselesaikan menjadi file biasa di dalam kasir. Pertahankan orkestrasi di titik masuk yang dinyatakan dan tempatkan kode implementasi di direktori tanggung jawab yang ditentukan; Cognis tidak mengimpor jalur modul lainnya.

Setiap modul eksternal mendeklarasikan `entrypoints.bootstrap`. Cognis hanya mengimpor file tersebut dan memanggil `bootstrapModule(ctx)` saat modul diaktifkan. Konteks cakupan menyediakan registrasi rute API, direktori statis modul, rute SPA, navigasi, pengaturan dan ekstensi halaman, kontribusi kemampuan, pembuatan aliran, dan injeksi tahapan. Letakkan dokumentasi yang dilokalkan di bawah `docs/` dan catatan rilis modul di bawah `docs/changelog/`; keduanya ditemukan dari repositori yang diinstal tanpa registrasi jalur inti. Aset browser tetap menjadi milik modul dan hanya diekspos melalui `ctx.registerStaticDir`. Modul dapat menerbitkan penyedia kemampuan browser khusus dengan `ctx.registerCapabilityProvider({ scriptUrl, providesCapabilities })`; Cognis memasukkannya ke katalog penyedia hanya selama modul diaktifkan dan menghapusnya saat pembersihan siklus hidup.

Modul aktif dapat secara sengaja menyediakan halaman bagi pengunjung anonim maupun yang sudah masuk dengan meneruskan `public: true` ke `ctx.registerSpaRoute`. Rute publik tidak boleh mendeklarasikan kebijakan `access` berbasis peran. Cognis hanya mengekspos deskriptor rute yang secara tegas bersifat publik kepada klien peramban anonim dan menyajikan kerangka SPA tanpa mengalihkan ke `/login`; setiap rute tetap memerlukan autentikasi secara bawaan.

Hook alur yang sensitif terhadap keamanan dan kontribusi rute milik gateway memerlukan `privileged: true` dalam manifes modul. Menyatakan modul sebagai penyedia SSO tidak memberikan akses ini. Modul berprivilege yang dipasang dari organisasi GitHub `Cognis-Labs-HQ` yang ditetapkan langsung dikenali sebagai tepercaya; setiap sumber lain yang meminta privilege menghasilkan peringatan keamanan eksplisit. Modul tetap tidak dapat mendaftarkan rute inti terlindungi secara langsung: modul autentikasi berprivilege menyumbangkan rute callback melalui kontrak `routeNamespace` dan `registerRoutes(router)` yang dibatasi pada adapter auth terdaftarnya.

Setiap kontribusi modul dilindungi berdasarkan pemilik: rute API, kemampuan, alur, hook alur, prefiks statis, dan registrasi UI menolak penggantian atau benturan lintas pemilik serta hanya dihapus bersama pemilik yang tercatat. Untuk integrasi lintas modul, `await ctx.getModuleAssurance(moduleId)` mengembalikan UUID target, versi, asal privilege, repositori sumber, dan status integritas runtime (`verified`, `unverified`, atau `failed`). Manifes terpasang disegel dalam provenance milik pemasang dan file yang dideklarasikan di-hash ulang saat runtime, sehingga konsumen dapat mewajibkan UUID yang diharapkan dan integritas `verified` sebelum memakai kemampuan modul lain.

Modul tanpa privilege dapat bekerja sama tanpa mengambil namespace host atau modul lain. Penyedia menerbitkan kemampuan atau alur dengan prefiks `<provider-module-id>:` miliknya sendiri; konsumen mendeklarasikan UUID penyedia dalam `requires`, mengambil kontrak bernamespace itu melalui `ctx`, dan dapat memverifikasinya dengan `getModuleAssurance`. Contohnya, modul Whiteboard dapat menerbitkan `nextcloud-whiteboard:openBoard` untuk dipakai modul Jitsi. Memperluas alur terbitan yang tidak sensitif terhadap keamanan juga tetap tidak memerlukan privilege. Hanya registrasi di luar namespace modul sendiri atau perluasan alur keamanan terlindungi yang memerlukan `privileged: true`.

Modul yang menerbitkan dokumen hukum, dukungan, atau dokumen lain yang relevan sebelum autentikasi dapat memanggil `ctx.registerAuthFooterPlugin({ scriptUrl })`. Cognis memuat kontributor aktif pada halaman masuk dan pendaftaran. Modul peramban mengekspor fungsi asinkron `listAuthFooterLinks()` yang memeriksa status otoritatifnya dan hanya mengembalikan tautan yang saat ini layak, seperti dokumen yang sudah diterbitkan. Cognis mengganti kumpulan tautan lama penyedia dengan deskriptor hasil tersebut dan menampilkannya pada bilah bersama di bawah panel autentikasi; array kosong menarik semua tautan penyedia itu.

`bootstrapModule` dapat mengembalikan pembuang, dan modul juga dapat mengekspor `teardownModule(ctx)`. Saat menonaktifkan atau mencopot pemasangan, Cognis memanggil kait tersebut dan kemudian menghapus setiap rute, direktori statis, kontribusi UI, kemampuan, aliran yang dibuat, dan tahapan aliran yang disuntikkan yang direkam oleh konteks cakupan. Modul tidak boleh menyimpan pengatur waktu, pendengar, soket, atau pekerjaan lain setelah pembuangannya selesai. Kontribusi yang dibuat dengan mengimpor internal inti atau dengan melewati `ctx` yang disediakan tidak dapat dilacak dan tidak didukung.

Manifes menyatakan `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, `requires` berbasis UUID, `entrypoints`, dan `assets`. Jalur aset bersifat relatif terhadap repositori. `assets.icon` mengidentifikasi ikon toko persegi, `assets.banner` mengidentifikasi pahlawan detail, dan `assets.screenshots` adalah galeri terurut. Jalur harus tetap berada di dalam repositori.

Kunci pelokalan harus menggunakan titik sebagai pemisah kata: tulis `module.example.canvas.label`, bukan `module.example.canvas_label` atau `module.example.canvas-label`. Segmen yang dipisahkan titik menjaga kepemilikan, pencarian, validasi, dan perilaku alat tetap dapat diprediksi. ID modul terdaftar merupakan satu-satunya pengecualian yang disengaja bila ID tetapnya sudah mengandung tanda hubung.

### Sumber dan repositori pribadi

Administrator mengelola satu registri sumber dan katalog modul bersama untuk seluruh instans. Kredensial sumber disembunyikan di server dan dienkripsi menggunakan `DATA_ENCRYPTION_KEY` yang persisten. Semua administrator dapat menggunakan, mengganti atau menghapusnya; API baca dan formulir hanya menampilkan apakah kredensial sudah dikonfigurasi. Kolom kata sandi kosong mempertahankan nilai tersimpan. Keyring browser tidak digunakan: atur kredensial bersama sekali di Sumber Modul. Pemindaian privat memerlukan PAT hanya baca dengan akses repositori dan metadata. Penemuan saat startup dan instalasi menggunakan kredensial tersimpan yang sama tanpa sesi browser. Lingkup enkripsi terikat pada identitas dan endpoint sumber; perubahannya memerlukan penggantian atau penghapusan. Pemindaian gagal mempertahankan katalog, pemindaian bersamaan digabungkan, dan hasil lama tidak menimpa konfigurasi sumber yang lebih baru. Permintaan penyedia menolak pengalihan dan memiliki batas waktu.

API penyimpanan sumber menerima `token` dan `clearCredential` dan hanya mengembalikan metadata publik, `credentialConfigured` serta revisi. Penemuan dan instalasi tidak lagi menerima token dari pemanggil. Instalasi menggunakan metadata repositori otoritatif dalam cache dan kredensial tersimpan pada server.

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

Ilustrasi modul diambil terpisah dari pemasangan kode. Aset GitHub publik dialirkan dari raw.githubusercontent.com; repositori privat dan Enterprise memakai respons mentah terautentikasi, sedangkan GitLab memakai endpoint berkas mentah. Cognis menyimpan byte dan jenis media pada cache hash terpisah lalu menyajikannya melalui endpoint aset katalog terautentikasi. Ini menghindari batas konten inline JSON GitHub Contents. Aset kosong dan unduhan di atas batas 10 MiB yang sudah ada ditolak. Log mencatat sumber, repositori, referensi, jalur, transport, tahap serta status HTTP atau alasan kegagalan. Segarkan katalog untuk mencoba pengambilan kembali. Ikon hilang tetap memakai SVG tanda tanya; banner hilang atau gagal didekode menampilkan pesan Gambar Tidak Tersedia yang dilokalkan.

### Preferensi modul

Modul dapat mengekspos pengaturan yang dapat diedit administrator dengan `ui.preferences`. Setiap bidang mendeklarasikan `key` yang stabil, `labelKey` yang dilokalkan, `descriptionKey` opsional, `type` berupa `boolean`, `string`, atau `number`, `default` opsional yang sesuai, tipe `password` untuk string sensitif yang disembunyikan, serta `required: true` bila pengaktifan harus diblokir sampai endpoint konfigurasi milik modul mengembalikan nilai; `ui.stringsBaseUrl` menunjuk terjemahan milik modul. Jika tidak dicantumkan, Cognis menemukan bundel standar `ui/languages/<locale>/strings.xml` secara otomatis. Cognis merender kontrak manifes ini pada tampilan detail modul terpasang, melakukan polling `GET /api/v1/modules/<id>/config`, dan mengirim perubahan dengan `PUT` ke endpoint milik modul yang sama. Modul memvalidasi, menerapkan, dan menyimpan konfigurasi operasionalnya. Modul tidak boleh menyediakan UI pengaturan kedua atau memakai preferensi pengguna Cognis sebagai penyimpanan konfigurasi. Menonaktifkan atau memulai ulang modul harus mempertahankan konfigurasi tersimpan ini; hanya alur penghapusan instalasi yang boleh menghapusnya. Untuk setiap kata sandi tersimpan, respons konfigurasi mengembalikan `<key>Configured: true` alih-alih rahasia; Cognis menampilkan `****`, menganggap bidang wajib terpenuhi, dan mengirim nilai kosong saat masker tidak berubah agar modul mempertahankan kata sandi tersimpan.

### Pencatatan log dan umpan balik pengguna

Kode bootstrap dan rute server menulis log aplikasi terstruktur melalui `ctx.log(level, message, meta)`. Cognis mengaitkan setiap entri dengan modul sebelum meneruskannya ke gateway Logging. Kode browser memperoleh `ui:log`, `ui:showToast`, dan `ui:openErrorPopup` dari `uiCtx.capabilities`; `ui:log` meneruskan entri terautentikasi ke log server, sedangkan kapabilitas umpan balik menggunakan UI host yang bertema dan aksesibel. Modul harus memakai proses ini, bukan hanya keluaran konsol browser untuk kegagalan operasional atau membuat permukaan notifikasinya sendiri.

### Penyegaran kanal rilis dan klien browser

Untuk modul terpasang, penyegaran katalog menyelesaikan cabang atau rilis yang terpasang terlebih dahulu dan hanya memakai cabang bawaan repositori ketika tidak ada kanal yang tercatat. Modul memakai data browser milik gateway melalui klien `uiCtx.capabilities` yang dideklarasikan; klien host saat ini mencakup `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient`, dan `share:uiClient`. Deklarasikan setiap kapabilitas UI yang dibutuhkan agar Cognis memuat penyedia aktifnya sebelum memasang rute modul.

Instalasi Marketplace hanya mengambil commit katalog yang dipilih melalui checkout Git dangkal. Setiap transfer dibatasi lima belas menit dan dibatalkan jika laju tetap di bawah 1 KiB/detik selama dua menit. Kegagalan sementara mendapat paling banyak tiga percobaan; transfer Git yang terputus dimulai ulang, bukan dilanjutkan. Browser menunggu hasil pekerjaan server dan membedakan batas waktu instalasi dari batas waktu pembentukan koneksi yang terkonfirmasi. Validasi repositori dan checksum manifes tetap dijalankan sebelum instalasi diselesaikan.

Modul yang menyimpan konfigurasi atau konten di luar checkout harus mengekspor `uninstallModule(ctx, { deleteContent })` dari entrypoint bootstrap yang dideklarasikan. Hook menghapus rekaman dan berkas milik modul hanya ketika `deleteContent` bernilai benar. Cognis memanggilnya saat kapabilitas masih tersedia melalui `ctx.getCapability`. Setelah berhasil, Cognis menghapus konfigurasi modul tersimpan dan checkout; jika gagal, keduanya tetap tersedia agar administrator dapat mencoba lagi.

Hook penghapusan menyelesaikan kapabilitas penyedia publik terkini melalui batas yang sama dengan bootstrap. Kapabilitas dari konteks rute tetap diutamakan; kapabilitas sistem privat tidak diekspos. Penyedia yang diperlukan untuk menghapus data harus tetap aktif saat modul yang bergantung padanya dihapus.

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

Modul yang dinonaktifkan tidak pernah mengimpor atau menjalankan bootstrap normalnya. Modul yang harus menyediakan konfigurasi saat nonaktif mendeklarasikan `entrypoints.disabledApi`; file terisolasi itu mengekspor `registerDisabledApiRoutes(ctx)` dan hanya boleh mendaftarkan rute yang ditandai `allowWhenDisabled` secara eksplisit. Entrypoint ini juga boleh mendaftarkan flow konfigurasi milik modul dan hook pada flow tersebut. Registrasi dihapus saat penyegaran atau penyiapan gagal; kapabilitas publik tetap tidak tersedia hingga modul diaktifkan.

Tunggu permintaan modul aktif sebelum menghapus flow-nya, dan tunda permintaan baru hingga rekonsiliasi selesai, termasuk ketika aktivasi gagal. Pemeriksaan persetujuan mempertahankan siklus hidup rute dan flow yang utuh saat modul Study lain diaktifkan.

### Panduan setelah aktivasi

Modul yang menyediakan permukaan konfigurasi di bagian lain Cognis dapat mendeklarasikan `ui.activationGuidance` alih-alih membuat formulir pengaturan modul yang kosong. Kontrak menyediakan `titleKey` yang dilokalkan, `descriptionKey` opsional, dan `steps` yang berurutan. Setiap langkah memiliki `id` stabil, `labelKey` yang dilokalkan, `descriptionKey` opsional, serta `targets` opsional. Target adaptor menggunakan `{ "kind": "adapter", "gatewayId": "<gateway>", "adapterId": "<adapter>" }`. Setelah aktivasi berhasil, Cognis menampilkan setiap langkah dan menawarkan untuk membuka Administrasi. Modul dapat mencantumkan beberapa target adaptor tanpa membuat core mengetahui nama penyedia.

### Pencarian kapabilitas publik

Modul eksternal menerbitkan kapabilitas server bersama melalui `ctx.contributePublicCapability(key, value)`. `ctx.getCapability` serta `ctx.capabilities.get`, `has`, dan `require` mengambil kapabilitas publik dari registri sistem yang aktif, termasuk kapabilitas yang diterbitkan setelah konsumen selesai melakukan bootstrap. Kapabilitas sistem privat tetap tersembunyi; `system:ctx` tidak pernah diberikan kepada modul. Permintaan penyegaran berjalan berurutan agar pembongkaran dan pendaftaran tidak bertumpang tindih. Menonaktifkan penyedia menghapus kontribusinya; mengaktifkannya kembali menerbitkan ulang kontribusi tersebut. Penyegaran yang gagal mengembalikan kesalahan kepada pemanggil tanpa menghalangi penyegaran berikutnya.

### Pengembangan dari templat

Semua modul baru wajib berasal dari [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template), dengan UUID produk baru serta identitas, repositori, gambar dan contoh yang diganti. Pertahankan AGENTS.md dan skrip validasi. Ikuti [standar kontributor](/docs/standard): handler API di `api/routes/<domain>/index.js`, CSS di `ui/styles/`, templat di `ui/templates/`, pengujian milik lapisan, dan catatan rilis di `docs/changelog/`. Jitsi Meet membuktikan struktur ini tanpa mengubah URL publik. Impor tetap lokal pada repositori; gunakan ctx untuk komponen lain.

### Siklus hidup registrasi

Pasang fungsi pembersihan registrasi server dengan `ctx.registerDisposer(dispose)`. Cognis menjalankannya dalam urutan terbalik saat refresh, penonaktifan dan bootstrap gagal, termasuk entry konfigurasi nonaktif. Kontrak publik `system:health:contribute(id, callback)` dan `auth:registerKeyringDataOwner(id, purge)` mengembalikan disposer miliknya. Pembersihan keyring hanya mereset data yang bergantung padanya, bukan identitas akun atau konten bersama yang tidak terkait.

Skrip penyedia browser mengekspor `mountProvider(scopedUiCtx)`, bukan mendaftarkan kapabilitas atau listener saat diimpor. Konteks terbatas memiliki kapabilitas, alur dan hook tahap; AbortSignal membatalkan listener, dan disposer yang dikembalikan melepaskan sumber daya lain. Rekonsiliasi katalog memasang setiap URL sekali meski muncul di kedua katalog, dan memasang kembali skrip yang dicache setelah aktif ulang. Gunakan `ui:navbarLinks.contribute(id, { href, label, visible })` untuk tautan navigasi milik host. Halaman rute tetap memakai kontrak `mount`/`unmount` sendiri.

### Lingkup perintah dan versi

Skrip npm berjalan di repositorinya; `npm --prefix <module-checkout> test` memilihnya secara eksplisit. Operasi modul terpasang memakai `cognisctl modules:<module-id>:<action>`. Keduanya berbeda. Deklarasi kapabilitas wajib mengendalikan ketersediaan; versi penyedia yang diuji adalah informasi diagnostik, bukan batas versi yang dipaksakan. Deklarasikan dependensi sebenarnya dan uji kontrak publik terpasang; jangan menjanjikan pemeriksaan versi yang tidak dijalankan kode.

## Diagnostik identitas modul dan kepemilikan penyedia browser

Administrator yang memasang modul dengan ID yang dimiliki UUID lain menerima konflik berisi `moduleId`, `installedModuleUuid`, dan `requestedModuleUuid`. Server dan UI siklus hidup modul mencatat identitas ini; pengguna nonadministrator tidak dapat mengaksesnya. ID dan UUID yang cocok tetap memungkinkan pembaruan. Jangan mengubah UUID yang diterbitkan atau menimpa pemasangan yang bertentangan untuk melewati pemeriksaan ini. Kepemilikan siklus hidup penyedia browser dibagikan melalui `ui:providerLifecycle`, sehingga pemuat yang dibundel maupun dilayani langsung merekonsiliasi satu katalog dan tidak memasang penyedia yang sama dua kali.

## Tindakan browser terbatas dan administrasi terverifikasi

Penyedia browser memperoleh `ui:scopedActions` dari ctx terbatasnya. Pemanggilan dengan `(ctx, moduleId, actions)` mendaftarkan alur yang dapat dijalankan untuk setiap tindakan bernama dan mengembalikan fungsi tindakan. Gunakan fungsi ini untuk membaca dan mengubah administrasi; host membuang alur dan menangani penolakan fungsi usang setelah penghentian. Hak administrator berasal dari peran terkini akun aktif, bukan bidang peran yang diberikan pemanggil.

Helper host `mountWhenDirect` memberikan AbortSignal melalui `mount(root, { signal })`, yang berakhir saat navigasi rute dijalankan atau halaman ditinggalkan. Halaman mengikat pembersihan pada sinyal itu dan memeriksanya setelah inisialisasi asinkron. Mount yang gagal membatalkan sumber daya miliknya; pekerjaan yang dibatalkan tidak menerbitkan galat pada halaman tujuan. Label tautan Markdown memisahkan karakter escape dari karakter biasa untuk menghindari backtracking ambigu. CI hanya meminta akses baca konten repositori.

Halaman langsung yang dibatalkan segera melepas token pemuatan bersama, meskipun inisialisasi terjemahan, penyedia, atau composer masih tertunda. Pembersihan sumber daya tetap terikat pada sinyal host yang sama.

## Pertahankan ID modul pada kunci

Kunci terjemahan menggunakan `module.<manifest.id>.<feature>.<label>`. Pertahankan ID modul yang terdiri dari beberapa kata beserta tanda hubungnya; untuk `terms-of-service`, gunakan `module.terms-of-service.admin.title`. Sufiks setelah ID modul menggunakan kata huruf kecil yang dipisahkan titik. Metadata manifes, berkas XML, dan referensi kode harus memakai namespace yang sama.

Tampilan marketplace mempertahankan nama, deskripsi, kategori, dan tag yang tersimpan bersama berkas terjemahan katalognya ketika modul terpasang menggunakan namespace berbeda. Preferensi modul terpasang mempertahankan URL terjemahannya sendiri; penemuan katalog baru menggantikan tampilan yang tersimpan.

### Pertahankan tautan legal di footer

Semua klien browser menggunakan registri footer milik `ctx`, termasuk skrip statis dan bundel yang dimuat terpisah. Deskriptor footer dapat meminta `target: "_blank"`; perender menambahkan `noopener noreferrer`. Penyedia autentikasi menyediakan label terjemahan dan konteks autentikasi, sedangkan tautan legal sesi masuk secara eksplisit memakai konteks aplikasi. Pemulihan riwayat dan cache browser memperbarui tautan dokumen legal yang diterbitkan tanpa mengganti tautan inti Lisensi atau Catatan Perubahan.

Fungsi bersama Core `createI18n` dan `extendI18n` menyelesaikan nilai bahasa pilihan yang hilang atau kosong melalui XML bahasa Inggris per kunci untuk bundel inti, modul, dan komponen. Kunci yang tidak terselesaikan menimbulkan `missing_translation:<key>`. Modul memasok URL bundelnya dan menggunakan resolver host tanpa menerapkan kebijakan pengganti sendiri.

Core menambahkan revisi modul terpasang ke URL aset UI milik modul saat mendaftarkan kontribusi. Skrip dan berkas bahasa modul divalidasi ulang tanpa mewarisi masa cache tetap milik rilis host. Service worker mengambil aset modul langsung tanpa cadangan cache dan mengganti cache asetnya. Pembaruan modul mengubah identitas impor titik masuk sehingga skrip lama tidak meminta dependensi yang telah dihapus.

Callback autentikasi mandiri menggunakan `navigateToDocument(path, { signal })` dari `page-entry.js` untuk perpindahan dokumen server. Fungsi ini memvalidasi URL HTTP(S) asal yang sama tanpa kredensial tertanam, mematuhi penjaga navigasi yang ada, dan mencegah navigasi setelah pembatalan. Navigasi dasbor dan perilaku perender yang tidak tersedia tetap ditangani router SPA yang tidak diubah. `ui:log` melewati permintaan anonim dan menangani kegagalan pengiriman; endpoint pencatatan tetap memerlukan autentikasi.

Callback SSO eksternal memerlukan `mountWhenDirect` dan `navigateToDocument` dari `page-entry.js` host. Jalankan `npm run check:ui-host` pada sumber dan `npm run check:ui-build` pada aset hasil build. Setelah penerapan, jalankan `npm run check:ui-host -- --origin https://your-cognis-host.example` dari jaringan yang dapat menjangkau host. Pemeriksaan jarak jauh hanya membaca JavaScript publik, tidak mengirim kredensial, dan mengurai ekspor tanpa menjalankan kode unduhan. Lingkungan proksi dapat mengaktifkan dukungan proksi Node dengan `NODE_USE_ENV_PROXY=1`.

Terapkan Core host yang sesuai sebelum memperbarui modul callback, termasuk aset UI dan manifes aset; mulai ulang proses jika masih memakai rilis sebelumnya. Muat ulang halaman callback hanya setelah pemeriksaan ekspor host publik lulus. Versi modul tidak membuktikan versi aset host yang disajikan. Identitas eksternal yang belum dikenal tetap memerlukan otorisasi pendaftaran ketika pendaftaran publik dinonaktifkan; identitas yang sudah dipetakan tidak mengulangi otorisasi pembuatan akun. HTTP 403 saja tidak mengidentifikasi alasan penolakan: periksa kode kesalahan dan bidang kelanjutan pendaftaran tanpa membagikan kredensial atau kuki.

## Isolasi dan siklus komponen

API mendelegasikan ruang nama ekstensi melalui kebijakan milik gateway aktif; Study memiliki aturan ruang nama bahasa. Kapabilitas penyedia Library ditarik saat adaptor atau dependensi Study dinonaktifkan, menolak referensi fungsi yang disimpan, dan kembali saat diaktifkan. Bootstrap adaptor Study menyediakan `onAvailabilityChange(listener)` untuk kontribusi sesuai siklus hidup; kegagalan bootstrap menarik kontribusi tersebut.

## Navigasi Offline

Deklarasikan `public: true` dan `offline: { assets: [...] }` pada rute SPA. Cantumkan semua dependensi runtime publik, termasuk katalog bahasa dan berkas data. Halaman harus bekerja tanpa permintaan API, data akun privat, atau penemuan seluruh penyedia host. Rute privat tidak dapat ikut serta. Gunakan tautan rute untuk navigasi. Dependensi yang belum dikenal atau diambil tetap tidak tersedia.

Service worker tidak menyimpan respons API, kredensial, atau HTML terautentikasi. Invalidasi modul menghapus katalog rute publik dan aset modul; aset dengan revisi harus cocok dengan katalog saat ini. Perubahan jarak jauh tidak dapat diketahui saat terputus: hanya revisi publik terakhir yang diketahui tersedia. Pemulihan memperbarui katalog dan memuat ulang melalui penjaga perubahan yang belum disimpan, lalu memulihkan otorisasi server terbaru. Pembaruan worker menunggu tab yang ada ditutup dan menyiapkan aset pemulihan sebelum aktivasi. Kunjungan pertama tanpa worker terpasang tidak dapat dimulai offline.

Gunakan tautan atau tombol dengan `data-navigation-path="/route"`; Cognis menonaktifkan tujuan yang tidak didukung tanpa mengaktifkan kontrol yang sudah dinonaktifkan pemiliknya.

### Belajar Offline

Mode Offline aktif secara bawaan di Pengaturan. Menonaktifkannya memulihkan peringatan koneksi dan pesan kesalahan yang ada serta menonaktifkan fallback worker. Saat aktif, hilangnya koneksi mengalihkan aplikasi ke mode offline tanpa pemberitahuan kesalahan; navigasi yang tidak tersedia diblokir tanpa popup kesalahan.

Study menyimpan snapshot JSON ringan dengan batas ukuran di tab saat ini: skema, data karakter/kartu yang diizinkan, lokasi, ID yang telah dilihat, favorit, dan dek yang pernah dibuka. Skema bahasa mengaktifkannya melalui `metadata.offline: { cache: "lightweight" }`. Cache Library menampung paling banyak 16 MB dan 100 pembacaan; cache baca lain paling banyak 4 MB dan 100 pembacaan. Byte audio, respons kamus, kredensial, dan dokumen terautentikasi tidak disimpan secara permanen.

Study privat memerlukan sesi akun yang sama, pernah diverifikasi, dan belum kedaluwarsa di tab yang sama. Muat ulang dan kunjungan pertama tetap mengikuti kontrak offline khusus halaman publik. Perubahan akun/sesi, preferensi, siklus hidup modul, dan pelepasan penyedia membatalkan snapshot privat. Pencabutan akses server tidak dapat diketahui saat terputus. Pemulihan memakai penjaga perubahan yang belum disimpan lalu memuat ulang otorisasi server.

## Antrean dan Persetujuan

Host menyediakan `offline:outbox`, `offline:state`, dan `offline:accessPolicy` melalui ctx. Komponen mendaftarkan pengirim selama masa hidup penyedia dan ID operasi stabil melalui `offline:enqueue`; `offline:flush` mengotorisasi dan mengirim. Antrean permanen per akun dibatasi 1.000 catatan dan 1 MB selama tujuh hari, tanpa token. ID serta waktu asli dipertahankan; kegagalan sementara dicoba ulang, catatan yang dikonfirmasi atau ditolak permanen dihapus. Penolakan menampilkan peringatan terlokalisasi. Keluar menghapus antrean akun; pergantian akun tidak mengirim data akun lain. Menonaktifkan Mode Offline menghentikan catatan baru. Antrean lama tetap dapat dikirim saat online.

Pemulihan memperbarui penyedia dan menjalankan `authenticate-session` sebelum tahap akhir `afterSession` mengirim aktivitas. Penyedia wajib mendeklarasikan `offlineAccessGuard` dalam katalog server. Persyaratan yang tidak diketahui atau persetujuan yang belum ada memblokir akses offline. Terms of Service menyimpan versi dokumen terakhir yang diambil dan persetujuan terkonfirmasi server per akun. Versi baru yang belum disetujui langsung memblokir pembacaan, navigasi, dan catatan offline serta pengiriman sampai persetujuan online berhasil. Persetujuan offline tidak tersedia. Snapshot privat tetap di tab; hanya antrean terbatas dan snapshot dokumen hukum bertahan setelah muat ulang. Tahap awal `beforeSession` menghapus verifikasi pengiriman sebelumnya sebelum setiap autentikasi.

## Perubahan Sosial Offline

Penyedia Profile dan Messages mendaftarkan tindakan HTTP melalui ctx sesuai masa hidupnya. Profil, pos, daftar ruang, dan percakapan terenkripsi yang pernah dimuat tersedia di tab terverifikasi. Teks profil, ketersediaan, status ikuti/blokir, tata letak banner, pembuatan/penghapusan pos, pesan terenkripsi di ruang lama, status akhir reaksi, dan tanda baca memakai buffer offline per akun. Suntingan online berikutnya menunggu antrean pemilik yang sama. Pergantian akun atau sesi selama persiapan atau menunggu buffer membatalkan tindakan. Pesan dan pos memakai UUID `operationId` stabil; pengulangan berbeda atau lintas akun ditolak. Pengiriman ulang pesan tidak menggandakan notifikasi. Tanda baca mempertahankan waktu baca awal.

Percakapan dienkripsi sebelum masuk buffer: teks asli, kunci ruang, dan kredensial tidak masuk antrean. Teks profil dan isi pos disimpan di penyimpanan browser akun saat ini. Avatar/banner hingga 350.000 byte biner berbagi antrean 1 MB/1.000 catatan/tujuh hari; gambar lebih besar memerlukan koneksi. Buffer penuh menampilkan kesalahan terlokalisasi; draf pesan dan pos baru dikosongkan setelah berhasil disimpan secara permanen. Batas berlaku untuk seluruh buffer.

Perubahan tetap tertunda sampai dikonfirmasi server. Pesan menampilkan status antrean; tindakan profil, pos, dan media menampilkan toast antrean standar. Menutup atau memuat ulang browser memicu konfirmasi perubahan belum tersimpan selama akun memiliki buffer, termasuk catatan dari penyedia nonaktif. Peringatan hilang setelah konfirmasi atau pembersihan akun. Browser menentukan teks konfirmasi dan mungkin memerlukan interaksi pengguna. Catatan tetap bertahan setelah muat ulang; peringatan tidak membuangnya.

Konten sosial tersimpan tetap hanya di tab dan memerlukan persetujuan. Kunjungan pertama, muat ulang privat offline, pembuatan ruang, pengelolaan anggota/kunci, panggilan, dan unggahan besar memerlukan koneksi. Status mengetik dan kehadiran bersifat sementara dan tidak dikirim ulang. Otorisasi server terkini diperiksa saat pengiriman; cache offline tidak dapat mengetahui pencabutan akses jarak jauh. Persetujuan ToS tetap wajib sebelum akses dan pengiriman.

## Banner atas bersama

Host menyediakan `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` sebelum halaman atau penyedia dipasang. Deskriptor menerima `title` berupa teks biasa, `bodyHtml` yang disanitasi, `actionsHtml` tepercaya, serta varian `info`, `success`, `warning`, atau `danger`. Hasilnya memiliki `element` dan `remove()`. ID yang sama hanya mengganti pemberitahuan pemiliknya; pembersih lama tidak menghapus penggantinya. Ikat masa hidup dengan `signal`; prioritas lebih kecil tampil dahulu. Judul di-escape dan pemanggil wajib menyanitasi teks kaya. Panggil `prepare()` saat daring untuk memuat gaya banner dan tombol bersama sebelum pemberitahuan pertama.

Mode Luring dan Broadcast memakai satu tumpukan lengket di bagian paling atas dokumen, di atas header aplikasi. Mode Luring mendapat prioritas, tidak dapat ditutup, dan tetap menyediakan Periksa Ulang Koneksi serta Muat Ulang setelah pulih. Menghapus pengumuman tidak menghapus Mode Luring. Broadcast melewati permintaan jaringan saat terputus; penyedianya membersihkan banner dan pengatur waktu ketika dilepas.

## Halaman Study luring kosong

Halaman Study yang sudah disiapkan tetap dapat dibuka dalam sesi luring terverifikasi dengan persetujuan wajib meskipun snapshot konten privat belum ada. Metadata bahasa atau preferensi yang hilang menghasilkan navigasi kosong. Explore memasang tampilan kosong normal dan menampilkan “Tidak ada konten luring tersimpan yang tersedia” alih-alih kesalahan rute atau toast kesalahan. Flashcards juga mempertahankan halaman kosong jika data dek atau sumber tampilan wajib belum tersedia. Pemberitahuan terikat halaman saat ini dan tidak diduplikasi. Kekurangan cache tidak menyembunyikan penolakan akses atau persetujuan. Library dan Flashcards menyiapkan terjemahan publik serta templat ringan saat daring; data privat tetap berada dalam cache tab yang dibatasi.

## Persiapan Aset Publik

Host menyediakan `ctx.capabilities.get("offline:assets")` dengan `prepare(paths, { signal })` dan `register(paths, { signal })`. Keduanya menggunakan alur bertahap `offline:prepareAssets`. Pendaftaran memulai persiapan latar belakang, mencoba kembali saat koneksi atau preferensi berubah, dan mengembalikan fungsi coba lagi. Hanya jalur publik relatif akar `/static/` atau `/assets/` yang diterima; permintaan tidak mengirim kredensial dan menolak respons private/no-store. Empat pekerja membaca isi respons. Permintaan bersamaan digabung per sinyal pemilik, kegagalan dapat dicoba kembali, dan pembatalan pemilik menghentikan pekerjaan serta pendengar. Fasilitas ini tidak menyimpan data API pribadi dan tidak memberikan akses luring. Callback `restoreRead` pada klien HTTP luring hanya berjalan setelah cache tidak ditemukan dengan akses yang sah dan menggunakan pembaca snapshot terlindungi yang sama. Penolakan akses tidak pernah diubah menjadi tampilan kosong atau antrean.

Persiapan tetap diam ketika Mode Luring dinonaktifkan, koneksi terputus, atau persetujuan wajib belum dipenuhi. Pendaftaran juga mencoba kembali setelah pembaruan persetujuan dan perubahan pengendali worker. Pekerjaan berhasil dibatasi pada pemilik dan worker saat ini; persiapan tanpa pengendali tidak menghalangi persiapan ulang ketika worker mengambil kendali.

## Favorit Study Bersama

Penyedia Study menyediakan `study:favourites` dengan operasi `load`, `toggle`, dan `has` yang mengikuti masa hidup penyedia. Utilitas tampilan memakai kapabilitas ctx ini, bukan cache terpisah per pemuat. Favorit disiapkan setelah autentikasi terverifikasi, menerapkan perubahan tertunda, dan berbagi keadaan terikat akun/sesi antara Explore, kartu belajar, dan impor berulang. Jika snapshot favorit opsional belum tersedia, pilihan kosong tetap menerapkan perubahan dalam antrean tanpa menyembunyikan konten atau menampilkan toast gagal memperbarui. Pergantian akun mengosongkan pilihan yang terlihat. Penolakan akses tidak pernah dianggap sebagai cache yang tidak ditemukan.

## Bootstrap dan Kanal

SMTP memiliki registrasi aksi, penyusunan pesan, dan antrean. Daftarkan `notify:registerSmtpPurpose` dengan pengenal lokal dan fungsi aksi yang membangun pesan dari variabel. Gateway, adapter, dan modul eksternal hanya mendaftar dalam lingkup bootstrap masing-masing; pengenal menyertakan pemilik. Auth, Registration, TFA, dan Share memiliki isi pesannya sendiri. SMTP tidak memiliki daftar tujuan atau templat aplikasi.

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

Setiap panggilan `notify:sendEmail` menyertakan tujuan yang sudah terdaftar dan variabel. `templateId` tidak digunakan lagi. Tujuan yang hilang atau tidak dikenal ditolak; aksi asinkron diperiksa kembali sebelum masuk antrean. Registrasi ditutup saat bootstrap selesai, gagal, atau melewati batas waktu. Hook penyelesaian gateway berjalan dengan pemilik yang sama setelah penyedia selesai melakukan bootstrap.

Penonaktifan gateway dan pelepasan modul menghapus aksi miliknya serta membatalkan pengiriman tertunda. Aktivasi ulang memulihkan antrean baru tanpa mengirim ulang email yang dibatalkan. Kategori bersama tetap aktif selama pemilik terdaftar lainnya masih aktif. Penonaktifan pengirim SMTP juga menutup sesi dan membatalkan pengiriman tertunda; aktivasi ulang hanya memulihkan registrasi yang masih ada.
