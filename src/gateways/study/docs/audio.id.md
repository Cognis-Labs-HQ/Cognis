# Audio pelafalan

Bootstrap memerlukan `study:audio:provider` dan mendaftarkan penyedia audio yang dapat dilepas bersama penyedia kamus dan goresan. Penyedia mencocokkan rekaman bawaan berdasarkan label ucapan dan bacaan pilihan, dengan pembacaan berkas terbatas serta kesalahan eksplisit bila audio tidak tersedia. Pelepasan membatalkan pengambilan yang tertunda. Cognis mengotorisasi akses kartu, menurunkan teks transformasi dari skema, dan menyimpan rekaman secara privat melalui Files tanpa mengubah bidang yang ditulis. Alur `study:library:audio` menjalankan otorisasi, validasi, dan resolusi; `study:audio:fetch` memvalidasi serta mengambil byte penyedia. Audio kalimat tetap memutar unsur penyusunnya secara berurutan.

## Kontrak penyedia audio

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Kedua modul Study memakai kontrak penyedia audio yang sama dan dapat dilepas, serta mengambil rekaman bawaan dengan pembacaan lokal terbatas. Host memiliki otorisasi, kebijakan cache, dan pemutaran komposit.

Kartu awal yang diucapkan menyertakan MP3 hasil sintesis di `data/library/assets/audio/`; teks ucapan identik memakai satu berkas bersama. Bahasa Inggris memakai Piper secara offline dengan suara berdasarkan dataset LJ Speech domain publik. Bahasa Jepang memakai Open JTalk secara offline dengan HTS Voice Mei, dengan atribusi kepada tim proyek MMDAgent dan Nagoya Institute of Technology di bawah CC BY. Pemberitahuan suara dan inventaris rekaman berada di `data/audio/`. Tanda baca tidak dibunyikan dan kalimat tidak memiliki rekaman sintesis: Cognis memutar audio unsur penyusunnya secara berurutan.

Audio baru diambil ketika pelajar meminta pemutaran. Membuka kartu saja tidak membuat permintaan audio. Kegagalan pemutaran memakai toast terlokalisasi host dan log terstruktur. Unsur kalimat mempertahankan deskriptor transformasi terpilih; endpoint audio terautentikasi menurunkan bentuk ucapan dari skema, bukan menerima teks tampilan sembarang. Rekaman awal kombinasi huruf Inggris disintesis dari fonem IPA yang ditulis, sedangkan rekaman alfabet mengucapkan nama huruf.

## Audio kamus dan cache host

Jika pelafalan yang diminta tidak tersedia dalam paket, English Study mengambil kata dari English Dictionary API dan mengunduh MP3 yang cocok dari endpoint media pelafalannya. Bacaan IPA pilihan harus cocok; pelafalan lain tidak pernah dipakai sebagai pengganti. Hanya media HTTPS pada `api.dictionaryapi.dev` yang diterima, pengalihan ditolak, pencarian dan unduhan berbagi satu tenggat, dan kedua respons dibatasi ukuran byte saat streaming. Rekaman yang tidak tersedia tetap menghasilkan kesalahan eksplisit. Layanan suara Google tidak digunakan.

Cognis mengelola cache rekaman, bukan modul. Setelah otorisasi, cache Files privatnya memakai ulang rekaman yang berhasil untuk kartu lain dan setelah mulai ulang. Permintaan pemutaran bersamaan berbagi pengambilan dan penyimpanan. Kunci mencakup identitas penyedia, revisi, bahasa, peran, label, dan bacaan; bacaan atau revisi penyedia yang berubah diselesaikan secara terpisah. Permintaan atau penulisan yang gagal dapat dicoba lagi. Modul menghubungi kamus hanya jika pemutaran diminta dan cache tidak tersedia.
