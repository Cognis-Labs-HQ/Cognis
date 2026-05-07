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
