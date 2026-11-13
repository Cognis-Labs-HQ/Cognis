# Audio pelafalan

Bootstrap memerlukan `study:audio:provider` dan mendaftarkan penyedia audio yang dapat dilepas bersama penyedia kamus dan goresan. Penyedia mencocokkan rekaman bawaan berdasarkan label ucapan dan bacaan pilihan, dengan pembacaan berkas terbatas serta kesalahan eksplisit bila audio tidak tersedia. Pelepasan membatalkan pengambilan yang tertunda. Cognis mengotorisasi akses kartu, menurunkan teks transformasi dari skema, dan menyimpan rekaman secara privat melalui Files tanpa mengubah bidang yang ditulis. Alur `study:library:audio` menjalankan otorisasi, validasi, dan resolusi; `study:audio:fetch` memvalidasi serta mengambil byte penyedia. Audio kalimat tetap memutar unsur penyusunnya secara berurutan.

## Kontrak penyedia audio

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Kedua modul Study memakai kontrak penyedia audio yang sama dan dapat dilepas, serta mengambil rekaman bawaan dengan pembacaan lokal terbatas. Host memiliki otorisasi, kebijakan cache, dan pemutaran komposit.

Rekaman awal memakai model neural multibahasa Kokoro secara offline dengan suara Inggris `bf_emma` dan Jepang `jf_alpha`. Klip memakai 128 kbps, jeda awal 200 ms, jeda akhir 180 ms, normalisasi puncak terbatas, dan ucapan lebih lambat. Atribusi model dan lisensi Apache disimpan di `data/audio/VOICE-LICENSE.txt`; inventaris mencatat suara dan pengolahannya.

Audio baru diambil ketika pelajar meminta pemutaran. Membuka kartu saja tidak membuat permintaan audio. Kegagalan pemutaran memakai toast terlokalisasi host dan log terstruktur. Unsur kalimat mempertahankan deskriptor transformasi terpilih; endpoint audio terautentikasi menurunkan bentuk ucapan dari skema, bukan menerima teks tampilan sembarang. Rekaman awal kombinasi huruf Inggris disintesis dari fonem IPA yang ditulis, sedangkan rekaman alfabet mengucapkan nama huruf.

## Audio kamus dan cache host

Jika pelafalan yang diminta tidak tersedia dalam paket, English Study mengambil kata dari English Dictionary API dan mengunduh MP3 yang cocok dari endpoint media pelafalannya. Bacaan IPA pilihan harus cocok; pelafalan lain tidak pernah dipakai sebagai pengganti. Hanya media HTTPS pada `api.dictionaryapi.dev` yang diterima, pengalihan ditolak, pencarian dan unduhan berbagi satu tenggat, dan kedua respons dibatasi ukuran byte saat streaming. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit. Layanan suara Google tidak digunakan.

Cognis mengelola cache rekaman, bukan modul. Setelah otorisasi, cache Files privatnya memakai ulang rekaman yang berhasil untuk kartu lain dan setelah mulai ulang. Permintaan pemutaran bersamaan berbagi pengambilan dan penyimpanan. Kunci mencakup identitas penyedia, revisi, bahasa, peran, label, dan bacaan; bacaan atau revisi penyedia yang berubah diselesaikan secara terpisah. Permintaan atau penulisan yang gagal dapat dicoba lagi. Modul menghubungi kamus hanya jika pemutaran diminta dan cache tidak tersedia.

## Komposisi dengan jeda dan penggantian manual

Kartu kalimat memiliki bidang audio opsional. Pada pemutaran pertama, Cognis mengotorisasi setiap unsur, memilih hanya kelompok pelafalan pertama, menerapkan transformasi yang dipilih, dan membuat satu WAV berkelanjutan dengan jeda awal serta jeda kata, koma, dan akhir kalimat. Rekaman disimpan secara privat; byte unsur, perubahan bacaan, transformasi, dan jeda menentukan identitasnya. Mekanisme ini berlaku sesuai kebutuhan untuk kartu baru maupun yang sudah ada. Mengunggah audio di penyusun biasa langsung menggantikan pemutaran hasil komposisi. Menghapus berkas eksplisit mengaktifkan komposisi otomatis lagi. Penyedia memasok klip kata; Cognis mengelola komposisi dan kebijakan cache.

## Cakupan inventaris referensi

Katalog referensi Jepang memuat seluruh 13.108 karakter dari salinan resmi KANJIDIC2 yang dipaketkan. Katalog Inggris memuat seluruh 135.969 entri leksikal Open English WordNet dengan 127.311 kunci ternormalisasi. Keduanya adalah penyedia kamus terpisah yang dimuat sesuai kebutuhan, bukan 149.077 kartu awal yang langsung diimpor. Pilih Kamus Referensi dalam pencarian Study untuk mengimpor entri yang didukung melalui validasi graf biasa. Rekaman tanpa makna atau bacaan yang dapat digunakan tetap tidak diketahui; pelafalan, terjemahan, dan diagram goresan tidak dibuat-buat. Inventaris ini bukan seluruh Han Unicode dan bukan daftar semua kemungkinan kata bahasa Inggris.

Bacaan Kanji diurutkan berdasarkan bukti umum JMdict dan penanda frekuensi yang tersedia, termasuk bentuk okurigana; tautan kelompok dan audio awal mengikuti urutan yang sama. Audio Kanji selalu memakai pelafalan pertama yang ditulis. Kartu kata Inggris yang ada memiliki satu IPA; entri referensi mempertahankan urutan sumber dalam ragam Britania pilihan sebelum ragam lain. Frekuensi pelafalan bergantung pada konteks dan sumber tidak menyediakan peringkat universal untuk setiap bacaan.

Bangun ulang pecahan referensi dengan `python3 scripts/import-reference.py --source <source-file>`; bahasa Jepang menerima `--priorities <reading-priorities.json>`. `data/reference/manifest.json` mencatat checksum sumber, atribusi, jumlah, dan digest pecahan. Hanya pecahan untuk kunci yang diminta dimuat; hasil saat runtime memakai cache Cognis.

## Rekaman bacaan utuh untuk referensi

Bahasa Jepang juga menyertakan 2.913 klip neural bacaan utuh dalam bank berkas terbatas di `data/audio/reference/`. Bersama rekaman awal, klip ini mencakup bacaan utama seluruh 12.356 karakter sumber yang memiliki bacaan; 752 karakter lainnya tidak diberi audio yang dibuat-buat. Indeks memilih bacaan pertama yang ditulis serta memeriksa batas berkas dan pembatalan. Buat rencana dengan `python3 scripts/reference-audio.py plan --work <directory>`, proses inventarisnya dengan skrip sintesis, lalu gunakan `pack` untuk menulis bank terbatas.

Alat pemeringkat Jepang menerima `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` serta opsi `--content-root data/library/content`. Alat mengutamakan bacaan leksikal mandiri yang umum, mengurutkan bacaan lain dari penyelarasan kata terverifikasi berbobot frekuensi, dan mempertahankan pilihan kartu tunggal yang ditinjau dalam `data/audio/primary-readings.json`. Penyuarakan dan geminasi dipetakan kembali ke bacaan sumber kanonis. Bacaan kun, on, dan nama tetap tersedia; hanya bacaan pertama yang dipilih menentukan pemutaran dan identitas cache. Penanda frekuensi membantu pengurutan dan bukan ukuran frekuensi pelafalan universal.

Komposisi otomatis memerlukan rekaman untuk unsur yang diucapkan. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit dan dapat ditambahkan melalui bidang unggahan audio biasa. Ejaan referensi yang tidak dapat ditautkan ke alfabet paket mempertahankan teks sumber dan definisinya tanpa tautan ejaan yang dibuat-buat.

## Pertahankan audio varian kalimat

Komposisi kalimat meminta label dan pelafalan utama dari transformasi terpilih, termasuk jalur bertingkat. Jika rekaman varian tidak tersedia, pemutaran gagal secara jelas alih-alih menelusuri referensi pelafalan bentuk dasar. Aturan yang sama berlaku untuk pemutaran varian langsung dan penyusun bertingkat.
