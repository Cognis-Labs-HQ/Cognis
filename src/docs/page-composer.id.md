# Page Composer

## Ikhtisar

`createPageComposer` adalah utilitas orkestrasi layout yang digunakan oleh semua halaman Cognis. Modul halaman individual mendeklarasikan _apa_ yang akan dirender — daftar blok konten bernama yang disebut elemen — dan composer menangani _bagaimana_ blok-blok tersebut disusun, dipersistensikan, dinavigasi, dan di-render ulang.

Titik masuk terdokumentasi `createPageComposer` tetap didukung dan tidak berubah. Fungsi tingkat rendah `createEditorPanelHandlers` kini memerlukan `state.editSession` yang dimiliki composer, bukan callback terpisah untuk menyimpan dan mengakhiri penyuntingan. Pengguna yang mengimpor fungsi ini secara langsung perlu beralih ke `createPageComposer` atau memperbarui komposisi yang mereka kelola bersama rilis inti yang sama.

## Tanggung Jawab

- Merender kumpulan elemen bernama ke dalam node DOM induk.
- Mengelola grid 90 px bebas saat `allowCustomization: true`.
- Mempersistensikan dan memulihkan penempatan dan visibilitas elemen melalui API preferensi.
- Menggerakkan navigasi sub-halaman saat `subPageNavigation: true`.

## Arsitektur

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

Deklarasi array mendukung `['full', 'fill']` untuk lebar penuh dan pengisian tinggi yang tersedia, atau `['full', n]` untuk lebar penuh dengan batas tinggi numerik. Composer utama maupun bersarang mengikuti ukuran ini pada grid sempit dan lebar. Saat widget diseret ke bawah grid, editor memperluas batas konten dan grid yang terlihat secara bersamaan sebelum widget dilepas.

### Navigasi Sub-Halaman

Saat `subPageNavigation: true`, hanya satu elemen yang terlihat pada satu waktu. Tombol toolbar dengan `[data-composer-scroll]` berfungsi sebagai pemilih bagian.

### Parkir DOM

Parkir DOM dinonaktifkan secara bawaan. Tetapkan `enableDomParking: true` pada page composer hanya ketika DOM media harus bertahan selama perenderan ulang composer. Saat aktif, kartu yang berisi iframe atau media lain diparkir dan dipulihkan sebagai DOM yang tetap utuh; fitur ini ditujukan untuk sematan berstatus seperti Jitsi Meet. Halaman biasa sebaiknya mengandalkan perenderan baru dan pemulihan status formulir sementara agar konten yang diperbarui tidak tertutup oleh pohon terparkir yang usang. Setiap pemanggilan `refresh()` secara bawaan merender ulang semua kartu terlihat yang sudah ada agar perubahan status tampil tanpa penggantian DOM khusus halaman.

### Persistensi

Layout menggunakan `GET` dan `PUT /api/v1/social/users/:account/preferences/:key`, dengan `:key` berupa `preferenceKey` yang dikodekan. Isi PUT adalah `{ layout: { layoutsByGrid: { "cols-N": { placements: [{id, col, row, w, h}], hidden: [] } } } }`, dengan `N` menunjukkan jumlah kolom grid. GET mengembalikan kumpulan profil terserialisasi dalam `data.layoutJson`. Menyimpan satu profil kolom mempertahankan profil lainnya.

**Selesai** mengirim snapshot tetap dari layout saat ini. Pada editor utama maupun bersarang, sesi penyuntingan dan perlindungan saat meninggalkan halaman tetap aktif hingga respons mengonfirmasi keberhasilan. Selama Selesai atau **Setel ulang** layout masih menunggu respons, perubahan layout dan pengiriman berulang diblokir, termasuk tambah, sembunyikan, pindahkan, ubah ukuran, setel ulang, dan buang. Selesai yang berhasil menutup penyuntingan; Setel ulang yang berhasil menjadikan layout bawaan yang dikirim sebagai acuan tersimpan baru sementara penyuntingan tetap terbuka.

Penyimpanan hanya dikonfirmasi oleh HTTP `200` dengan JSON `data.saved === true`. Respons lain, termasuk `202`, `204`, dan konfirmasi dengan format tidak valid, tidak membuktikan keberhasilan. Tanpa akun atau token akses, penyimpanan ditolak tanpa mengirim permintaan tulis.

Penyimpanan yang gagal atau belum terkonfirmasi mempertahankan perlindungan draf dan menampilkan toast terlokalisasi dengan petunjuk pemulihan pada tampilan pemiliknya. Setelah permintaan selesai, pilih Selesai untuk mencoba kembali secara sengaja sebagai permintaan baru atau buang draf lokal. Penolakan permintaan atau respons yang hilang membuat hasil di server tidak diketahui: hal tersebut tidak membuktikan bahwa tidak ada penulisan. Membuang draf memulihkan acuan lokal sebelumnya dan tidak membatalkan kemungkinan penulisan di server. Acuan tersebut dapat berasal dari layout bawaan pengganti, bukan pembacaan server yang terkonfirmasi. Pembacaan awal yang gagal atau tidak valid tetap memakai tampilan pengganti yang ada; hal ini bukan bukti status server. Composer tidak mengulangi permintaan secara otomatis atau mencocokkan hasilnya melalui pembacaan ulang. Mengubah lebar tampilan saja tidak menyimpan layout.

Editor bersarang yang dipertahankan dapat menyelesaikan penyimpanan saat subhalamannya tidak aktif tanpa menampilkan toast terlambat atau mengubah kontrol subhalaman lain. Penyelesaian setelah seluruh composer dilepas tidak memperbarui tampilan yang telah dilepas.

Selain itu, draf formulir kini disimpan di `localStorage` per pengguna, path halaman, dan kunci composer agar input tetap muncul setelah halaman dimuat ulang atau setelah render ulang responsif. Penyimpanan draf formulir yang persisten bersifat opt-in: hanya field yang leluhur terdekatnya memiliki atribut `data-composer-include-form-memory="true"` yang ditulis ke localStorage. Field tanpa leluhur opt-in tetap diambil dalam snapshot sementara di memori agar bertahan selama render ulang responsif dalam sesi yang sama, namun tidak pernah ditulis ke penyimpanan persisten. Field sensitif (`password`, `file`, `hidden`, dan pengenal yang memuat `password`/`secret`/`token`) selalu dikecualikan dari penyimpanan draf persisten terlepas dari status opt-in.

Kartu dengan formulir besar (minimal 6 field yang dapat dipersistensikan) menampilkan tombol **Setel ulang draf**. Tombol ini menghapus draf tersimpan untuk kartu tersebut dan mengembalikan field saat ini ke nilai bawaan.

## Kontrol penunjuk mengikuti tema

Tombol gaya penunjuk bersama memakai warna teks standar tema (`--text`) untuk ikon mouse, laser, dan bidik, termasuk pada halaman komponen tertanam. Warna penunjuk peserta tetap sama.

## Tata Letak Responsif

Page Composer memakai lebar konten yang tersedia, bukan nama perangkat. Pada lebar 640 piksel CSS atau kurang, kartu biasa disusun dalam satu kolom penuh dengan tinggi sesuai konten; susunan desktop tetap tersimpan. Tampilan tertanam tanpa bingkai tetap mengatur ukurannya sendiri. Panel lebih lebar mempertahankan kisi dan profil tersimpan berdasarkan jumlah kolom.

Editor tata letak tetap tersedia di ponsel dan tablet. Pegangan ukuran sentuh dan tombol hapus selalu terlihat. Gunakan Tambah di panel elemen tanpa menyeret; fokuskan widget lalu gunakan tombol panah untuk memindahkan atau Shift bersama panah untuk mengubah ukuran. Gerakan penunjuk yang dibatalkan tidak diterapkan. Editor bertingkat memakai seluruh lebar, dan perubahan ukuran tampilan bertingkat mempertahankan kontrol formulir yang ada.

Di bawah 900 piksel CSS, bilah alat terbuka sebagai panel samping. Filter dan tombol tindakan setempat tetap dapat digunakan saat terbuka; navigasi menutupnya. Escape atau latar belakang menutup panel dan mengembalikan fokus. Navigasi, bilah alat, pencarian, dan popup berbagi penguncian gulir agar lapisan bertingkat tidak membuat halaman terkunci atau bergulir di belakang dialog.

Tutorial ruang kerja menyorot tombol navigasi yang terlihat di layar sempit dan menjelaskan kontrol sentuh serta papan ketik. Skenario regresi browser mencakup 320, 390, 768, 1024, dan 1440 piksel CSS, rotasi, masukan papan ketik, dan pemasangan berulang. Jalankan `COGNIS_BROWSER_TESTS=1 node --test src/ui/tests/page-composer/responsive-browser.test.js` pada mesin yang dapat menjalankan Chromium. Emulasi tidak membuktikan perilaku Safari iOS, PWA terpasang, atau papan ketik perangkat nyata.

## Jalur Draf Sumber Daya

Pengelola draf formulir publik menerima dependensi opsional `resolveStoragePath(scopeKey)`. Halaman sumber daya dapat mengembalikan jalur kanonis miliknya agar pembacaan, penyimpanan, dan penghapusan draf terkirim tetap mengarah ke sumber daya yang sama setelah navigasi. Nilai bawaan tetap jalur halaman saat ini. Akun yang terautentikasi tetap menjadi bagian dari setiap kunci penyimpanan; resolver tidak mengubah isolasi akun atau pengecualian kolom.
