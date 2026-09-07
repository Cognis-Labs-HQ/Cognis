# Paket bahasa Study

## Tujuan

Paket bahasa Study adalah rilis data eksternal yang tidak dapat diubah. Paket berisi manifes, satu skema Library berversi, rekaman, aset opsional, lisensi, dan dokumentasi terlokalisasi. Paket tidak pernah menempatkan rekaman bahasa di inti Cognis ataupun memuat perender yang dapat dieksekusi, rute, CSS, atau penyimpanan khusus penyedia.

## Susunan dan manifes

Paket menyediakan `manifest.json`, berkas skema dan direktori konten yang dirujuk, serta direktori aset opsional. Semua jalur harus relatif, dipisahkan garis miring, dan tidak boleh memiliki bagian kosong atau absolut, rujukan induk (`..`), garis miring terbalik, maupun pelolosan symlink. Pecahan konten dibaca menurut lapisan dan nama berkas secara leksikal.

Manifes menyatakan `id`, `publisher`, `namespace`, `version` semantik, `contentRevision`, `schema`, `content`, `assets` opsional, dan `license`. Lisensi memiliki ID yang terbaca mesin serta dapat memiliki URL HTTPS dan atribusi. Paket hanya memiliki namespace yang disebutkan oleh manifes dan skema; setiap ID rekaman diawali `<namespace>:`. Penerbit wajib merilis byte yang berubah dengan versi paket baru.

## Kontrak skema netral

Skema memiliki versi bilangan bulat positif yang tidak dapat diubah, tag bahasa BCP 47, namespace, label dan deskripsi terlokalisasi, serta lapisan dengan nama bebas dari konsumen. Cognis tidak memberi makna pada ID lapisan. Sebagai gantinya, lapisan dapat menyatakan peran semantik `atomicWritingUnit`, `compoundWritingUnit`, `lexicalUnit`, `orderedLexicalSequence`, `passage`, `definition`, atau `practicePrompt`.

Bidang memiliki metadata terlokalisasi dan tipe `string`, `number`, `integer`, `boolean`, `localizedText`, `stringList`, atau `asset`. Bidang dapat diwajibkan dan membawa petunjuk perenderan detail untuk perender, urutan, grup, dan visibilitas. Petunjuk lapisan dapat memilih bidang judul dan urutan bidang.

Relasi memiliki metadata terlokalisasi, lapisan target, kardinalitas minimum dan maksimum, urutan opsional, batas target wajib, serta perilaku penghapusan wajib (`restrict`, `detach`, atau `cascade`). Peran resolver (`grapheme`, `token`, `longestMatch`, atau `explicit`) menyatakan maksud tanpa menanamkan algoritme. Referensi berurutan memerlukan posisi bilangan bulat nonnegatif yang unik.

Lapisan dapat menerbitkan kompatibilitas aktivitas dan jalur minat sebagai peran camel-case bernamespace. Nilai ini adalah tag penemuan, bukan kait yang dapat dieksekusi. Lapisan juga dapat menyatakan bidang aset goresan SVG atau JSON dan sistem koordinat. Bidang aset merujuk berkas relatif terhadap direktori aset manifes. Saat pemasukan atomik, Cognis menyimpan byte tervalidasi beserta identitas paket yang tidak dapat diubah dan mengganti nilai rekaman dengan URL aset Library yang diautentikasi.

## Rekaman dan referensi

Setiap subdirektori langsung di bawah konten harus sama dengan satu ID lapisan yang dinyatakan. Pecahan JSON berisi larik atau `{ "records": [...] }`. Rekaman berisi `id` stabil bernamespace, `label` tampilan, `fields` bertipe, dan referensi. Setiap target harus ada dalam paket dan versi skema yang sama, mengarah ke lapisan yang dinyatakan, serta memenuhi kardinalitas, urutan, dan batas target wajib. Semua fakta bahasa tetap berada di berkas rekaman eksternal ini.

## Pemasukan deterministik

`inspectContentPack` menjalankan prapemeriksaan tanpa penulisan: manifes, versi semantik, lisensi, jalur aman, kepemilikan namespace, rujukan skema, bidang bertipe, seluruh graf relasi, dan setiap rujukan aset diperiksa. Data manifes, skema, dan rekaman kanonis serta byte aset yang dirujuk di-hash dalam urutan deterministik. Kegagalan tidak menghasilkan penulisan.

`ingestContentPack` menyimpan skema tervalidasi, rekaman, relasi, dan tanda terima dalam satu transaksi basis data. ID dan versi skema tidak dapat diubah. Instalasi ulang digest penerbit/paket/versi yang identik bersifat idempoten; byte berbeda untuk identitas yang sama ditolak. Antarmuka memakai peran semantik dan petunjuk tampilan, sedangkan adapter resolver dan aktivitas berpartisipasi melalui alur `ctx`.

## Daftar periksa pembuat

- Simpan semua rekaman dan aset di luar inti Cognis.
- Gunakan namespace dan ID rekaman stabil, versi paket semantik, serta versi skema yang tidak dapat diubah.
- Lokalkan metadata skema, lapisan, bidang, relasi, dan dokumentasi.
- Nyatakan lisensi, atribusi, perilaku penghapusan relasi, dan batas yang tepat.
- Jalankan pemeriksaan sebelum penerbitan dan jangan bergantung pada urutan pencacahan pecahan konten.
