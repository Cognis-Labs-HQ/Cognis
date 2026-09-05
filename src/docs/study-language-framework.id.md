# Paket bahasa Study

## Tujuan

Paket bahasa Study adalah rilis data eksternal yang tidak dapat diubah. Paket berisi manifes, satu skema Library berversi, rekaman, aset opsional, lisensi, dan dokumentasi terlokalisasi. Rekaman bahasa, perender yang dapat dieksekusi, rute, CSS, dan penyimpanan khusus penyedia tidak pernah berada di inti Cognis.

## Susunan dan manifes

Paket menyediakan `manifest.json`, berkas skema dan direktori konten yang dirujuk, serta direktori aset opsional. Semua jalur harus relatif, dipisahkan garis miring, dan tidak boleh kosong, absolut, memuat induk (`..`), garis miring terbalik, atau lolos melalui symlink. Pecahan konten dibaca menurut lapisan dan nama berkas secara leksikal.

Manifes menyatakan `id`, `publisher`, `namespace`, `version` semantik, `contentRevision`, `schema`, `content`, `assets` opsional, dan `license`. Lisensi memiliki ID yang terbaca mesin serta URL HTTPS dan atribusi opsional. Manifes dan skema memiliki namespace yang sama; setiap ID rekaman diawali `<namespace>:`. Perubahan byte wajib dirilis sebagai versi paket baru.

## Kontrak skema netral

Skema memiliki versi bilangan bulat positif yang tidak dapat diubah, tag bahasa BCP 47, namespace, label dan deskripsi terlokalisasi, serta lapisan dengan nama bebas. Cognis tidak menentukan ID lapisan. Lapisan dapat menyatakan peran semantik `atomicWritingUnit`, `compoundWritingUnit`, `lexicalUnit`, `orderedLexicalSequence`, `passage`, `definition`, atau `practicePrompt`.

Bidang memiliki metadata terlokalisasi dan tipe `string`, `number`, `integer`, `boolean`, `localizedText`, `stringList`, atau `asset`. Bidang dapat diwajibkan dan membawa petunjuk perenderan detail untuk perender, urutan, grup, dan visibilitas. Lapisan dapat memilih bidang judul dan urutan bidang.

Relasi memiliki metadata terlokalisasi, lapisan target, kardinalitas minimum dan maksimum, urutan opsional, target wajib, serta perilaku penghapusan wajib (`restrict`, `detach`, atau `cascade`). Peran resolver (`grapheme`, `token`, `longestMatch`, atau `explicit`) menyatakan maksud tanpa menanamkan algoritme. Referensi berurutan memerlukan posisi bilangan bulat nonnegatif yang unik.

Lapisan dapat menerbitkan kompatibilitas aktivitas dan jalur minat sebagai peran camel-case bernamespace. Nilai ini adalah tag penemuan, bukan kait yang dapat dieksekusi. Lapisan juga dapat menyatakan bidang aset goresan SVG atau JSON dan sistem koordinat. Bidang aset merujuk jalur di bawah direktori aset manifes. Saat pemasukan atomik, Cognis menyimpan byte tervalidasi beserta identitas paket yang tidak dapat diubah dan mengganti nilai rekaman dengan URL aset Library yang diautentikasi.

## Validasi dan pemasukan

`inspectContentPack` memeriksa manifes, versi semantik, lisensi, jalur aman, kepemilikan namespace, rujukan skema, tipe bidang, seluruh graf relasi, dan setiap aset sebelum penulisan. Manifes, skema, rekaman, dan byte aset di-hash secara kanonis dalam urutan deterministik. Kegagalan tidak menghasilkan penulisan.

`ingestContentPack` menyimpan skema, rekaman, relasi, dan tanda terima dalam satu transaksi. ID dan versi skema tidak dapat diubah. Instalasi identik bersifat idempoten; byte berbeda untuk identitas yang sama ditolak. Semua fakta bahasa tetap berada di berkas konten eksternal; resolver dan aktivitas terhubung melalui alur `ctx`.
