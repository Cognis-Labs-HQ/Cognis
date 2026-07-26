# Page Composer

## Ikhtisar

`createPageComposer` adalah utilitas orkestrasi layout yang digunakan oleh semua halaman Cognis. Modul halaman individual mendeklarasikan _apa_ yang akan dirender — daftar blok konten bernama yang disebut elemen — dan composer menangani _bagaimana_ blok-blok tersebut disusun, dipersistensikan, dinavigasi, dan di-render ulang.

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

### Navigasi Sub-Halaman

Saat `subPageNavigation: true`, hanya satu elemen yang terlihat pada satu waktu. Tombol toolbar dengan `[data-composer-scroll]` berfungsi sebagai pemilih bagian.

### Parkir DOM

Parkir DOM dinonaktifkan secara bawaan. Tetapkan `enableDomParking: true` pada page composer hanya ketika DOM media harus bertahan selama perenderan ulang composer. Saat aktif, kartu yang berisi iframe atau media lain diparkir dan dipulihkan sebagai DOM yang tetap utuh; fitur ini ditujukan untuk sematan berstatus seperti Jitsi Meet. Halaman biasa sebaiknya mengandalkan perenderan baru dan pemulihan status formulir sementara agar konten yang diperbarui tidak tertutup oleh pohon terparkir yang usang.

### Persistensi

Layout tetap disimpan melalui API preferensi menggunakan `preferenceKey`. Selain itu, draf formulir kini disimpan di `localStorage` per pengguna, path halaman, dan kunci composer agar input tetap muncul setelah halaman dimuat ulang atau setelah render ulang responsif. Penyimpanan draf formulir yang persisten bersifat opt-in: hanya field yang leluhur terdekatnya memiliki atribut `data-composer-include-form-memory="true"` yang ditulis ke localStorage. Field tanpa leluhur opt-in tetap diambil dalam snapshot sementara di memori agar bertahan selama render ulang responsif dalam sesi yang sama, namun tidak pernah ditulis ke penyimpanan persisten. Field sensitif (`password`, `file`, `hidden`, dan pengenal yang memuat `password`/`secret`/`token`) selalu dikecualikan dari penyimpanan draf persisten terlepas dari status opt-in.

Kartu dengan formulir besar (minimal 6 field yang dapat dipersistensikan) menampilkan tombol **Setel ulang draf**. Tombol ini menghapus draf tersimpan untuk kartu tersebut dan mengembalikan field saat ini ke nilai bawaan.
