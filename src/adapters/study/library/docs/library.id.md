# Adapter Pustaka

## Skema milik konsumen

Adapter Pustaka menyimpan materi studi generik yang saling terhubung. Konsumen mendaftarkan skema berversi dan tetap melalui kapabilitas ctx `study:library`. Skema mendefinisikan bahasa, lapisan, bidang bertipe, dan relasi terarah; istilah seperti alfabet, kata, atau kalimat tidak ditetapkan adapter.

Relasi menentukan lapisan target, kardinalitas, urutan, dan resolver opsional. Setiap penulisan memvalidasi bidang, versi skema, target, visibilitas, dan kardinalitas. Definisi alternatif dimodelkan sebagai lapisan dan relasi deklaratif milik konsumen.

## Resolusi, API, dan UI

Resolver `grapheme` memakai grafem Unicode, sedangkan `longest-match` memakai blok yang dipisahkan secara eksplisit. Keduanya mengembalikan usulan dan unit yang belum terselesaikan tanpa membuat entri diam-diam. Penyedia lookup dipasang melalui `registerLookupProvider`, mengembalikan saran berperingkat beserta asalnya, dan dapat dilepas melalui callback registrasi. Pembuatan, resolusi, dan lookup mengikuti flow ctx bernama.

Gateway Study menyediakan penemuan skema, daftar, pembuatan, detail, penelusuran dua arah, pratinjau resolusi, dan saran lookup. UI berbasis skema menyembunyikan lapisan definisi dan partikel yang bersifat internal dari penjelajahan langsung. Lapisan yang dapat dijelajahi memakai tab, filter metadata, kartu entri, pil metadata, dan ikon cakupan. Detail popup pakai ulang menampilkan definisi dan makna di bawah judul entri yang lebih besar. Unsur penyusun yang dikenali, termasuk partikel kalimat, muncul sebagai subkotak yang dapat dinavigasi di dalam judul tersebut alih-alih bagian Komponen terpisah; detail partikel tetap hanya-baca. Filter metadata tampil sebagai pil yang langsung diterapkan dan memakai grup detail skema jika disediakan modul. Akses global, pengguna, dan kelas tetap ditegakkan pada batas layanan.

## Paket konten deklaratif

Paket bahasa terpasang memanggil `inspectContentPack(root)` untuk validasi atau `ingestContentPack(root)` untuk memasang Pustaka khusus data. Akar paket berisi `manifest.json`, berkas skema yang dirujuk, serta direktori konten dengan subdirektori ID lapisan. Berkas memuat array rekaman dengan ID stabil dan relasi eksplisit. Cognis memvalidasi seluruh graf, membuat ID bernamespace, mencatat digest dan tanda terima, lalu menulis skema, entri, serta edge secara atomik. Kontrak penulisan lengkap berada di `study-language-framework.id.md`.

## Definisi yang dilokalkan

Setiap lapisan dengan peran semantik `definition` mendeklarasikan awalan kunci string milik modul serta bidang kunci dan teks terlokalnya. Definisi dikelola hanya ketika menyunting entri yang membutuhkannya; definisi tidak dapat dijelajahi atau disunting secara langsung sebagai bagian Pustaka tersendiri. Bahasa Inggris tetap menjadi teks sumber wajib, kunci yang dihasilkan tetap disimpan pada rekaman definisi, dan kapabilitas opsional `localization:translateString` dapat melengkapi bahasa yang kosong.

## Pelafalan dan audio unit tulisan

Lapisan dengan peran `atomicWritingUnit` atau `compoundWritingUnit` mendeklarasikan bidang standar wajib `pronunciation` (`stringList`) dan `audio` (`audio`). Paket konten dapat menyediakan berkas MP3, Ogg, WAV, WebM, atau M4A maupun URL HTTPS. Berkas lokal tetap menjadi aset paket yang diautentikasi. Audio jarak jauh diambil melalui rute Pustaka yang mengotorisasi entri dan dibatasi pada host HTTPS publik serta jenis media audio yang didukung. Pustaka mendaftarkan namespace `study-library-audio` yang dikelola komponen pada gateway Berkas dan menyimpan setiap URL satu kali memakai kunci deterministik tanpa batas ukuran di tingkat adapter. Penyimpanan persisten, kuota, dan pengelolaan berkas fisik tetap menjadi tanggung jawab gateway Berkas, sementara setiap permintaan pemutaran tetap menegakkan cakupan entri.

## Grup filter metadata

Kolom lencana dapat memakai `detail.group` untuk mengelompokkan filter terkait dan `detail.exclusive` untuk mengatur pilihan. Jika setiap kolom dalam grup menetapkan `exclusive: true`, memilih satu pil akan menghapus pilihan grup sebelumnya. Nilai bawaan `false` mengizinkan beberapa pil terpilih. Semua kolom dalam grup bernama harus memakai pengaturan eksklusivitas yang sama.
