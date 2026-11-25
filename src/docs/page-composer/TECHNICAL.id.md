# Referensi Teknis

Page Composer mengelola tata letak elemen, tampilan responsif, siklus hidup DOM, dan penyimpanan tata letak/draf opsional.

## Antarmuka

createPageComposer(root, options) membuat siklus halaman. Elemen memasok konten dan callback; init memasang shell dan refresh memperbarui deskriptor.

## Konfigurasi

createPageComposer menerima elements, pageManifest, i18n, signal, dan opsi tata letak. Elemen viewport mengikuti kontrak responsif; preferensi memakai preferenceKey.

## Perilaku

### Ikhtisar

`createPageComposer` adalah utilitas orkestrasi layout yang digunakan oleh semua halaman Cognis. Modul halaman individual mendeklarasikan _apa_ yang akan dirender — daftar blok konten bernama yang disebut elemen — dan composer menangani _bagaimana_ blok-blok tersebut disusun, dipersistensikan, dinavigasi, dan di-render ulang.

### Tanggung Jawab

- Merender kumpulan elemen bernama ke dalam node DOM induk.
- Mengelola grid 90 px bebas saat `allowCustomization: true`.
- Mempersistensikan dan memulihkan penempatan dan visibilitas elemen melalui API preferensi.
- Menggerakkan navigasi sub-halaman saat `subPageNavigation: true`.

### Elemen

Sebuah elemen adalah blok konten bernama:

```js
{
  id: 'my-widget',
  label: 'Widget Saya',
  render: () => '<h2>Konten</h2>',
  gridSize: { default: [4, 3], min: [2, 2] },
  pinned: false,
}
```

| Field      | Diperlukan | Keterangan                                             |
| ---------- | ---------- | ------------------------------------------------------ |
| `id`       | Ya         | Pengidentifikasi string unik                           |
| `label`    | Ya         | Label yang dapat dibaca manusia                        |
| `render`   | Ya         | Fungsi yang mengembalikan string HTML                  |
| `gridSize` | Tidak      | `{ default: [w,h], min: [w,h] }` dalam unit grid 90 px |
| `pinned`   | Tidak      | Jika `true`, elemen tidak dapat dihapus oleh pengguna  |

### Layout Grid

Unit grid adalah 90 px lebar dan tinggi. `gridSize.max: 'full'` merentangkan elemen di semua kolom yang tersedia.

### Navigasi Sub-Halaman

Saat `subPageNavigation: true`, hanya satu elemen yang terlihat pada satu waktu. Tombol toolbar dengan `[data-composer-scroll]` berfungsi sebagai pemilih bagian.

### Parkir DOM

Parkir DOM dinonaktifkan secara bawaan. Tetapkan `enableDomParking: true` pada page composer hanya ketika DOM media harus bertahan selama perenderan ulang composer. Saat aktif, kartu yang berisi iframe atau media lain diparkir dan dipulihkan sebagai DOM yang tetap utuh; fitur ini ditujukan untuk sematan berstatus seperti Jitsi Meet. Halaman biasa sebaiknya mengandalkan perenderan baru dan pemulihan status formulir sementara agar konten yang diperbarui tidak tertutup oleh pohon terparkir yang usang. `refresh(elements)` memperbarui definisi dan penempatan elemen sambil mempertahankan DOM kartu. Gunakan `refreshElements(ids)` untuk merender ulang konten yang berubah melalui Composer; perubahan tata letak saja mempertahankan kontrol dan draf.

### Persistensi

Layout tetap disimpan melalui API preferensi menggunakan `preferenceKey`. Selain itu, draf formulir kini disimpan di `localStorage` per pengguna, path halaman, dan kunci composer agar input tetap muncul setelah halaman dimuat ulang atau setelah render ulang responsif. Penyimpanan draf formulir yang persisten bersifat opt-in: hanya field yang leluhur terdekatnya memiliki atribut `data-composer-include-form-memory="true"` yang ditulis ke localStorage. Field tanpa leluhur opt-in tetap diambil dalam snapshot sementara di memori agar bertahan selama render ulang responsif dalam sesi yang sama, namun tidak pernah ditulis ke penyimpanan persisten. Field sensitif (`password`, `file`, `hidden`, dan pengenal yang memuat `password`/`secret`/`token`) selalu dikecualikan dari penyimpanan draf persisten terlepas dari status opt-in.

Kartu dengan formulir besar (minimal 6 field yang dapat dipersistensikan) menampilkan tombol **Setel ulang draf**. Tombol ini menghapus draf tersimpan untuk kartu tersebut dan mengembalikan field saat ini ke nilai bawaan.

### Kontrol penunjuk mengikuti tema

Tombol gaya penunjuk bersama memakai warna teks standar tema (`--text`) untuk ikon mouse, laser, dan bidik, termasuk pada halaman komponen tertanam. Warna penunjuk peserta tetap sama.

### Tata Letak Responsif

Page Composer memakai lebar konten yang tersedia, bukan nama perangkat. Pada lebar 640 piksel CSS atau kurang, kartu biasa disusun dalam satu kolom penuh dengan tinggi sesuai konten; susunan desktop tetap tersimpan. Tampilan tertanam tanpa bingkai tetap mengatur ukurannya sendiri. Panel lebih lebar mempertahankan kisi dan profil tersimpan berdasarkan jumlah kolom.

Editor tata letak tetap tersedia di ponsel dan tablet. Pegangan ukuran sentuh dan tombol hapus selalu terlihat. Gunakan Tambah di panel elemen tanpa menyeret; fokuskan widget lalu gunakan tombol panah untuk memindahkan atau Shift bersama panah untuk mengubah ukuran. Gerakan penunjuk yang dibatalkan tidak diterapkan. Editor bertingkat memakai seluruh lebar, dan perubahan ukuran tampilan bertingkat mempertahankan kontrol formulir yang ada.

Di bawah 900 piksel CSS, bilah alat terbuka sebagai panel samping. Filter dan tombol tindakan setempat tetap dapat digunakan saat terbuka; navigasi menutupnya. Escape atau latar belakang menutup panel dan mengembalikan fokus. Navigasi, bilah alat, pencarian, dan popup berbagi penguncian gulir agar lapisan bertingkat tidak membuat halaman terkunci atau bergulir di belakang dialog.

Tutorial ruang kerja menyorot tombol navigasi yang terlihat di layar sempit dan menjelaskan kontrol sentuh serta papan ketik. Skenario regresi browser mencakup 320, 390, 768, 1024, dan 1440 piksel CSS, rotasi, masukan papan ketik, dan pemasangan berulang. Jalankan `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` pada mesin yang dapat menjalankan Chromium. Emulasi tidak membuktikan perilaku Safari iOS, PWA terpasang, atau papan ketik perangkat nyata.

Pada ponsel, merek dan judul halaman berbagi baris pertama header; navigasi dan kontrol akun menempati baris kedua. Subjudul tetap tersedia bagi teknologi bantu, dan layar terkecil menampilkan ikon merek agar judul panjang mendapat ruang. Kontrol bilah alat yang tertutup bergulir di bawah header melekat. Menu tindakan mengambang memakai jarak ringkas dengan sasaran sentuh 44 piksel. Kontrol tutorial memiliki latar buram penuh dan sasaran bergaris jelas; pada layar pendek, penjelasan dapat memakai ruang header tanpa menutupi footer. Teks seluler mengikuti pilihan font dan ukuran pengguna, bukan mengecilkan seluruh halaman.

Jalankan pemeriksaan header dan tutorial bersama dengan `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/*.test.js`. Untuk memeriksa navigasi langsung dan SPA pada halaman bawaan, sediakan instans terisolasi yang berjalan melalui `COGNIS_CORE_BROWSER_URL` dan berkas kredensial JSON (`username`, `password`, `provider`) melalui `COGNIS_BROWSER_CREDENTIALS`, lalu jalankan `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/integration/core-pages-browser.test.js`. Pengujian mengharapkan akun admin khusus serta gateway bawaan aktif; halaman modul eksternal dikecualikan.

### Ruang Kerja Responsif

Page composer menentukan presentasi. Setiap perender elemen menerima konteks tetap berisi `compact`, `layout`, `drawer`, dan `touch`. Pemilihan memakai lebar dalam kartu yang tersedia, termasuk perubahan akibat bilah samping atau tata letak bersarang. Gunakan `responsive: true` untuk markup berbeda saat presentasi berubah; elemen biasa yang menyimpan keadaan mempertahankan DOM. Gunakan `onResize(presentation)` untuk pembaruan geometri. Kode halaman tidak memerlukan kueri layar atau penangan perubahan ukuran sendiri.

Bilah alat desktop memakai kolom bersama yang dibatasi agar konten memperoleh ruang yang cukup. Kolom mengikuti ukuran teks pilihan; ponsel dan tablet memakai panel Composer.

Nilai `layout` bersama adalah `compact` (hingga 640px), `medium` (hingga 900px), dan `regular`, berdasarkan lebar dalam kartu. Tampilan padat seperti Kalender memakai agenda pada kedua presentasi terbatas.

Atribut gaya `data-composer-layout`, `data-composer-drawer`, dan `data-composer-touch` dikelola composer untuk tata letak dan masukan. Komposisi biasa maupun bersarang menerima konteks yang sama. Composer mengamati konten dan kartu, memulihkan nilai formulir, serta melepaskan pengamat dan penangan peristiwa saat halaman berakhir.

Perubahan tata letak memberi notifikasi melalui `onResize`; `onRender` memasang perilaku pada konten yang dihasilkan. Perubahan tata letak saja mempertahankan pengikatan kontrol yang tidak berubah. Penyegaran konten eksplisit memasang elemen yang diminta satu kali.

Untuk memeriksa tampilan pada instans berjalan yang terisolasi, atur `COGNIS_BROWSER_TESTS=1`, `COGNIS_CORE_BROWSER_URL`, dan `COGNIS_BROWSER_CREDENTIALS`. Opsi `COGNIS_BROWSER_BYPASS_SERVICE_WORKER=1` memisahkan perenderan dari cache service worker; perilaku luring dan PWA memerlukan pemeriksaan tersendiri.

### Navigasi Halaman dan Panel

Gunakan kisi Halaman pada kepala utama untuk berpindah tujuan. Pemilih halaman ringkas mempertahankan fokus papan ketik dan ditutup dengan Escape. Page Composer menyediakan tombol SVG sudut ganda yang sama di kiri atas untuk semua panel samping. Pesan memakai tombol ini untuk percakapan.

`stackAt: "medium"` meminta satu kolom mengalir hingga batas tablet bersama. `readingOrder` menentukan urutan elemen pada tampilan itu tanpa mengubah tata letak desktop tersimpan. Elemen formulir dan draf bertahan saat tata letak berubah.

Halaman tetap dengan satu elemen memakai `fillViewport: true`. Tandai area baca utama dengan `data-composer-viewport-body`; Composer menyediakan 20rem untuk area tersebut dan mengukur jarak serta kontrol di sekitarnya secara terpisah. Halaman menyesuaikan ruang layar yang tersisa bila cukup dan dapat digulir jika tinggi minimum tidak muat. Perubahan ukuran kontrol, penggantian konten, dan pembesaran teks menghitung ulang minimum. Pengguliran dokumen tidak menambah tinggi yang telah disesuaikan. Composer menyediakan tombol panel samping; `openToolbar(trigger)` dan `closeToolbar()` tetap tersedia untuk tindakan yang disengaja.

Gunakan `contentScrolling: false` untuk dokumen biasa yang tumbuh mengikuti kontennya. Kalender dan Pesan menyesuaikan area tampilan dengan pengguliran internal pada area baca.

Dialog bersama menerima `surface: "reader"` untuk konten bacaan. Permukaan ini memakai penanda presentasi Composer, menjaga kepala dan kaki di luar isi bergulir, serta melepas pengamat presentasi saat ditutup.

Kepala dan kaki halaman memakai satu lebar kerangka sehingga tepi luarnya sejajar pada ponsel, tablet, dan desktop.

Elemen dapat mendeklarasikan wadah stabil `data-composer-header`. Composer menempatkan kontrol panel di sana dan mempertahankan tombol serta perilaku fokus saat digambar ulang. Konten yang diganti asinkron ditempatkan di anak wadah tersebut. Penanda gaya `data-composer-sidebar-trigger` menunjukkan kontrol bersama. Kalender dan Pesan memakai tempat ini agar lebih banyak ruang vertikal tersedia untuk konten.

Composer menonaktifkan penjangkaran gulir browser di seluruh konten kisi agar perubahan lebar mempertahankan posisi gulir di dalamnya. Komponen pemilik konten mengatur pengguliran saat menambahkan atau mengganti konten.

Jarak tepi bilah samping bersama menyesuaikan lebar yang tersedia. Desktop memakai satu jarak ke konten utama, sedangkan lebar panel dalam rem mengikuti ukuran teks yang lebih besar. Kontrol komponen dapat menyesuaikan ukurannya sambil mempertahankan sasaran sentuh yang nyaman.

Entri menu samping bersama menandai pilihan dan fokus papan ketik. Jarak dan pengguliran panel samping dikelola Composer, bukan setiap halaman.

Tombol menu panel mempertahankan permukaan transparan saat diam serta sorotan, pilihan, dan fokus papan ketik sesuai tema. Kolom formulir mempertahankan gaya kolom; tombol tindakan mempertahankan warna semantiknya. Permukaan terang memakai lapisan sorotan berwarna teks.

### Tampilan Panel Composer

Composer memakai permukaan panel Pesan untuk panel samping dan konten utama. Setiap kontribusi bilah alat dibungkus `composer-sidebar-section` yang dilindungi; konten luarnya tetap transparan dan memakai jarak Composer. Kartu utama tidak menambahkan latar buram atau bayangan di atas panel. Baris menu berbagi gaya teks, sorotan, pilihan, dan fokus; kontrol konfirmasi, batal, dan netral yang eksplisit tetap memakai gaya semantiknya. Sematan tanpa bingkai atau batas tetap transparan. Gaya halaman tidak boleh menimpa kelas panel yang dilindungi atau menetapkan token bersama `--toolbar-bg`. Lapisan kaskade `composerSurfaces` dikhususkan untuk host.

Composer mengatur jarak dalam bagian konten: 28px pada layar lebar dan 14px pada lebar 640px atau kurang, termasuk halaman yang memenuhi area tampilan. Sematan tanpa bingkai atau batas tetap rata. Pembungkus daftar bilah samping tetap transparan tanpa jarak dalam agar entri menu tidak mendapat permukaan kartu tambahan. Gaya halaman tidak boleh menetapkan `--composer-grid-inset` atau menimpa jarak dalam host.

### Pemuatan Font

Teks bersama membungkus sesuai lebar yang tersedia sebelum dan sesudah font dimuat, tanpa memperkecil ukuran font pilihan.

## Keamanan

Composer mengatur presentasi dan masa DOM, bukan otorisasi sumber daya. Tindakan tetap memakai alur pemilik; markup serta gaya mematuhi batas panel dan menu.

## Referensi

- [src/ui/reuse/page-composer/index.js](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/ui/reuse/page-composer/index.js)
