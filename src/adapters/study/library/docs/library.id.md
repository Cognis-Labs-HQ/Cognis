# Adapter Pustaka

## Skema milik konsumen

Adapter Pustaka menyimpan materi studi generik yang saling terhubung. Konsumen mendaftarkan skema berversi dan tetap melalui kapabilitas ctx `study:library`. Skema mendefinisikan bahasa, lapisan, bidang bertipe, dan relasi terarah; istilah seperti alfabet, kata, atau kalimat tidak ditetapkan adapter.

Relasi menentukan lapisan target, kardinalitas, urutan, dan resolver opsional. Setiap penulisan memvalidasi bidang, versi skema, target, visibilitas, dan kardinalitas. Definisi alternatif dimodelkan sebagai lapisan dan relasi deklaratif milik konsumen.

## Resolusi, API, dan UI

Resolver `grapheme` memakai grafem Unicode, sedangkan `longest-match` memakai blok yang dipisahkan secara eksplisit. Keduanya mengembalikan usulan dan unit yang belum terselesaikan tanpa membuat entri diam-diam. Penyedia lookup dipasang melalui `registerLookupProvider`, mengembalikan saran berperingkat beserta asalnya, dan dapat dilepas melalui callback registrasi. Pembuatan, resolusi, dan lookup mengikuti flow ctx bernama.

Gateway Study menyediakan penemuan skema, daftar, pembuatan, detail, penelusuran dua arah, pratinjau resolusi, dan saran lookup. Setiap entri memiliki URL `/study/library/:schemaId/:layerId/:entryId`. UI berbasis skema menampilkan lapisan terlokalisasi, bidang, dan relasi. Akses global, pengguna, dan kelas tetap ditegakkan pada batas layanan.

## Paket konten deklaratif

Paket bahasa terpasang memanggil `inspectContentPack(root)` untuk validasi atau `ingestContentPack(root)` untuk memasang Pustaka khusus data. Akar paket berisi `manifest.json`, berkas skema yang dirujuk, serta direktori konten dengan subdirektori ID lapisan. Berkas memuat array rekaman dengan ID stabil dan relasi eksplisit. Cognis memvalidasi seluruh graf, membuat ID bernamespace, mencatat digest dan tanda terima, lalu menulis skema, entri, serta edge secara atomik. Kontrak penulisan lengkap berada di `study-language-framework.id.md`.

## Definisi yang dilokalkan

Setiap lapisan dengan peran semantik `definition` mendeklarasikan awalan kunci string milik modul serta bidang kunci dan teks terlokalnya. Pembuatan entri mewajibkan bahasa Inggris, meminta masukan untuk setiap bahasa antarmuka yang diiklankan Cognis, menyimpan kunci yang dihasilkan pada rekaman definisi, dan dapat mengisi bahasa yang kosong melalui kapabilitas opsional `localization:translateString`.
