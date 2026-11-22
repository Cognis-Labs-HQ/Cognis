# Kontrak Dokumentasi

Dokumentasi memisahkan pengenalan, prosedur praktis, dan referensi teknis agar pembaca dapat memilih kedalaman yang diperlukan.

## Antarmuka

Setiap komponen menyatakan `documentation.readme`, `documentation.usage`, dan `documentation.technical` dengan nilai `docs/README.en.md`, `docs/USAGE.en.md`, dan `docs/TECHNICAL.en.md`. Setiap bahasa mempertahankan akhiran `.en`, `.de`, `.id`, atau `.ja`. Jalur manifes menunjuk anggota Inggris dalam keluarga dokumen lokal, bukan berkas bahasa tampilan tetap. Topik inti ditemukan dari direktori berisi `index.<locale>.md`, `usage.<locale>.md`, dan `technical.<locale>.md`.

## Konfigurasi

Jalankan `npm run check:docs`. CI permintaan penggabungan juga membandingkan berkas catatan baru dengan cabang sumber melalui `--base` dan `--branch`. Hanya satu set catatan empat bahasa yang diizinkan.

## Perilaku

### Batas Logging

JavaScript dan TypeScript aplikasi, skrip peramban sebaris, serta penangan peristiwa harus menerbitkan diagnostik melalui kapabilitas log yang diinjeksi atau port diagnostik peramban publik. Akses konsol asli dibatasi pada adaptor keluaran logging dan inisialisasi gateway logging. Penangan lain dalam berkas inisialisasi tidak mendapat pengecualian. Laporan perintah dan build menggunakan aliran terminal secara eksplisit. Pemeriksaan konsol asli juga mencakup sumber perkakas; fixture pengujian tetap berada di luar pemindaian sumber produksi.

Jalankan `node --import tsx --test src/tooling/tests/logging/*.test.js` untuk memeriksa repositori dan kasus deteksi. Pemeriksaan mencakup modul eksternal yang terpasang, mendukung `COGNIS_EXTERNAL_MODULES_ROOT`, dan melaporkan berkas serta baris pelanggaran. Alias, akses terhitung, dan impor `node:console` ditolak tanpa pengecualian untuk pelanggaran lama.

Topik baru membuka Info. Info, Penggunaan, dan Teknis adalah tiga tampilan satu versi komponen. Server membaca semua sumber sebelum menerbitkan paket secara atomik; tampilan hilang atau terjemahan parsial menolak penerbitan. Pergantian tampilan mempertahankan versi, dan paket historis tetap terbaca setelah komponen dihapus.

Isi dokumen, judul navigasi, dan pencarian mendahulukan bahasa UI aktif, lalu bahasa cadangan terkonfigurasi dan Inggris. Pilihan berlaku konsisten untuk Info, Penggunaan, Teknis, serta versi arsip.

## Keamanan

Dokumentasi bersifat publik: jangan sertakan kredensial, data akun pribadi, atau rahasia operasional. Penunjuk manifes tetap di ruang dokumentasi pemiliknya. Penemuan inti membaca paket entri direktori, bukan nama berkas Markdown sembarang.

## Referensi

README menjelaskan tujuan, tugas, akses, dan langkah awal tanpa spesifikasi titik akhir atau kode implementasi. USAGE berisi prosedur nyata atau contoh publik, prasyarat, hasil, dan pemecahan masalah. TECHNICAL membahas antarmuka, konfigurasi, perilaku, keamanan, dan referensi.

Nama H2 terlokalisasi dan urutannya ditentukan dalam `src/tooling/reuse/documentation/structure.json`. Gunakan satu H1 sepanjang maksimal 30 karakter dan paragraf pengantar. Bagian kosong atau tambahan, templat belum terisi, pagar kode tidak seimbang, dan tingkat judul terlewati menggagalkan validasi. Templat berada di `.github/documentation/`.

Jelaskan perilaku yang didukung pada bagian yang sesuai. Riwayat rilis dan kronologi implementasi hanya berada dalam catatan cabang. Paragraf teknis bersama memiliki satu pemilik; dokumen lain menautkan referensinya.

Aset komponen memakai awalan statis publik milik komponen. Aset yang hanya digunakan satu komponen dengan ruang aset sendiri tidak boleh diterbitkan di inti. Aset inti dan aset bersama tetap di inti. Impor CSS membentuk satu blok berurutan alfabetis dengan satu baris kosong sebelum aturan gaya.

Isi setiap peran dengan informasi berguna yang diverifikasi pada sumber, bukan teks baku. Periksa metode, jalur, kolom, izin, nilai baku, persistensi, dan integrasi belum lengkap pada pemiliknya. Prosedur masuk Penggunaan, kontrak implementasi masuk Teknis. Pemeriksaan menolak petunjuk generik serta sumber hilang, tetapi tidak membuktikan kebenaran semua prosa.

Tautan berkas sumber GitHub memakai alias cabang baku `blob/HEAD` atau `raw/HEAD`, termasuk dalam dokumentasi arsip. Tautan komit pada catatan perubahan tetap menunjuk komit permanen.
