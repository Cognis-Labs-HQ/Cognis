# Paket bahasa Study

## Ringkasan

Bahasa Study adalah paket konten deklaratif yang berisi manifes, skema Pustaka milik konsumen, data bahasa, dan dokumentasi. Paket tidak memuat UI browser, rute API, penyimpanan, CSS, atau halaman khusus bahasa. Adapter Study di Cognis menghasilkan antarmuka dari skema dan metadata tampilan.

## Kontrak paket

Bootstrap minimal hanya boleh menemukan akar instalasi lalu memanggil `study:library.ingestContentPack(root)` melalui `ctx`. Bootstrap tidak mengimpor internal Pustaka. Adapter Pustaka memiliki penemuan berkas, keamanan jalur, validasi, ID stabil, transaksi, idempotensi, pencatatan, dan persistensi. Resolver serta kamus eksternal menjadi adapter terpisah.

## Struktur wajib

```text
cognis-language-ja/
  package.json
  manifest.json
  schema.json
  content/
    characters/hiragana.json
    symbols/common.json
    definitions/core.id.json
    words/beginner-01.json
    sentences/beginner-01.json
  docs/standard.id.md
```

Manifes memuat `id`, `publisher`, `version`, `contentRevision`, jalur relatif `schema` dan `content`, serta lisensi. Jalur tidak boleh keluar dari akar paket. Kombinasi penerbit, ID paket, dan versi yang sama dengan byte berbeda akan ditolak.

## Skema dan konten

Skema menetapkan ID stabil, versi positif, bahasa BCP 47, dan lapisan dalam jumlah bebas. Lapisan memiliki bidang bertipe serta relasi terarah dengan target, kardinalitas, urutan, dan resolver opsional. Nama lapisan milik konsumen: bahasa Inggris dapat memakai huruf, sedangkan bahasa Korea dapat memakai Jamo dan blok suku kata.

Setiap direktori langsung di bawah `content/` harus sama dengan ID lapisan. Berkas JSON berisi array rekaman atau `{ "records": [...] }`. ID rekaman stabil dalam paket; relasi memakai ID tersebut dan posisi untuk urutan. Cognis memvalidasi seluruh graf sebelum menulis apa pun.

## Ingesti dan UI

`inspectContentPack` membaca secara deterministik, memeriksa jalur, skema, bidang, dan relasi, lalu menghitung digest. `ingestContentPack` menyimpan skema, rekaman, edge, dan tanda terima dalam satu transaksi. Instalasi ulang identik dinyatakan tidak berubah; isi berbeda dengan versi paket sama ditolak.

Adapter Study generik menghasilkan tampilan penjelajah, detail, sistem tulisan, leksikon, penyusun kalimat, dan relasi. Paket boleh memberi petunjuk tampilan deklaratif, tetapi tidak boleh memberi templat, skrip, atau CSS. Tokenizer, dekomposisi Hangul, morfologi, serta lookup eksternal berada dalam adapter yang terhubung melalui `ctx`.
