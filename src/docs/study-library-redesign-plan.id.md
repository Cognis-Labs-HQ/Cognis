# Rencana kerangka relasi Pustaka Studi

## Arah

Ganti katalog lapisan tetap dengan registri skema milik konsumen. Modul bahasa mendaftarkan skema pustaka berversi melalui `ctx`; adapter tidak mengetahui konsep alfabet, blok suku kata Hangul, kata, atau latihan. Adapter hanya menyediakan penyimpanan, penegakan relasi, orkestrasi resolusi, kontrol akses, dan metadata UI generik.

Skema mendefinisikan ID lapisan stabil, label terlokalisasi, bidang, serta relasi terarah beserta kardinalitas, urutan, kewajiban, perilaku penghapusan, dan resolver yang diizinkan. Versi skema yang sudah dipakai bersifat tetap; perubahan struktur memerlukan migrasi yang diterbitkan konsumen.

## Kontrak dan model data

1. Tambahkan kapabilitas registrasi skema `study:library` pada gateway Study. Tolak ID ganda, target menggantung, siklus terlarang, kardinalitas mustahil, dan kemunduran versi.
2. Jadikan pembuatan, perubahan, penghapusan, resolusi, lookup, impor, ekspor, dan migrasi sebagai flow `ctx` bernama dengan tahap yang dapat dilepas. Adapter menyumbang otorisasi, validasi, persistensi, dan audit; konsumen menyumbang normalisasi dan resolver.
3. Kontrak lookup netral memungkinkan penyedia mengumumkan bahasa, skema, lapisan, dan bidang yang didukung. Saran membawa asal dan tingkat keyakinan serta harus diterima sebelum disimpan. Adapter tidak pernah mengimpor Jisho atau penyedia konkret.
4. Simpan versi skema, entri generik, nilai bidang bertipe, edge berurutan, definisi alternatif, dan asal data. Nama lapisan tidak boleh dikodekan dalam tabel atau percabangan layanan.
5. Validasi atomik menegakkan lapisan target, kardinalitas, keunikan, urutan, kebijakan bahasa, visibilitas lingkup, dan aturan penghapusan. Definisi alternatif adalah entri biasa yang dihubungkan relasi deklaratif.

## Resolusi dan UI

Segmentasi grafem Unicode hanyalah dasar generik. Konsumen dapat memasang resolver pencocokan terpanjang dan komposisi rekursif untuk huruf Inggris, Jamo dan blok suku kata Korea, atau Kana dan Kanji Jepang. Komponen ambigu tidak pernah dibuat diam-diam: layanan mengembalikan saran berperingkat dan rentang yang belum terselesaikan. Kalimat dibuat dari blok entri kata yang dipilih dan diurutkan secara eksplisit; urutan edge menjadi sumber kebenaran.

UI milik adapter dibangun dengan `createPageComposer` dan menghasilkan navigasi serta editor dari metadata skema. UI mencakup pencarian dan filter, detail setiap entri, relasi masuk dan keluar, definisi alternatif, asal data, editor dengan umpan balik kardinalitas, pratinjau resolver, tinjauan lookup, serta penyusun blok kalimat. URL kanonis seperti `/study/library/:schemaId/:layerId/:entryId` bekerja saat dimuat langsung maupun melalui app router. Kode browser memakai klien UI gateway Study.

## Urutan pengiriman dan kriteria penerimaan

Mulai dengan fixture kontrak bahasa Inggris, Korea, dan Jepang beserta kasus skema tidak valid, hak akses, dan ambiguitas. Lanjutkan dengan registri dan tipe generik, penyimpanan serta migrasi yang dapat dipulihkan, orkestrasi flow, resolver, API dan klien gateway, UI lengkap yang aksesibel, lalu perbandingan dual-read dan penghapusan lapisan tetap.

Desain selesai ketika struktur baru dapat didaftarkan tanpa perubahan adapter, semua jalur tulis menolak edge tidak valid, fixture Inggris dan Korea berhasil diurai, identitas kalimat berasal dari blok berurutan, penyedia lookup dapat dipasang atau dimatikan hanya lewat `ctx`, setiap entri memiliki URL detail yang aman dimuat ulang, dan migrasi dapat dikembalikan tanpa kehilangan ID, edge, asal data, atau kontrol lingkup.
