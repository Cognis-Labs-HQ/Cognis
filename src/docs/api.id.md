# API

## Ikhtisar

`src/api/` adalah lapisan HTTP Cognis. Di sini terdapat server Node.js yang kompatibel dengan Express, registry route, middleware autentikasi, dan semua modul route handler tipis yang memetakan permintaan HTTP ke operasi gateway. Lapisan API sengaja dijaga tipis: route handler mengurai dan memvalidasi input, mendelegasikan ke gateway, dan mengembalikan amplop respons yang stabil.

Server dirakit dari apa yang ada saat startup, bukan dari daftar komponen yang dikodekan secara keras. Gateway mendaftarkan route mereka sendiri selama bootstrap melalui `ctx.routeRegistry.register(...)`.

## Tanggung Jawab

- Menjalankan server HTTP dan menghubungkan registry route ke penanganan permintaan.
- Menyediakan middleware `requireAuth` dan `getAuthClaims` untuk semua route handler yang dilindungi.
- Menegakkan konvensi amplop respons `{ data }` / `{ error }`.
- Mem-bootstrap semua gateway sesuai urutan dependensi.
- Menginisialisasi skema database saat startup.

## Arsitektur

### Amplop Respons

Semua respons API menggunakan salah satu dari dua bentuk ini:

```json
{ "data": { ... } }
```

```json
{ "error": { "code": "forbidden", "message": "Membutuhkan scope admin" } }
```

### Model Autentikasi

Dapatkan token melalui `POST /api/v1/auth/login`. Kirim token sebagai `Authorization: Bearer <token>`. Masa berlaku token dikendalikan oleh `COGNIS_ACCESS_TOKEN_TTL_SECONDS` (default: `43200`, dua belas jam).

### Lokasi Sumber Utama

| Path                              | Tujuan                                           |
| --------------------------------- | ------------------------------------------------ |
| `src/api/main.ts`                 | Titik masuk server                               |
| `src/api/server.ts`               | Setup server HTTP dan dispatch route             |
| `src/api/reuse/route-registry.ts` | Registry route untuk pendaftaran mandiri gateway |
| `src/api/bootstrap/gateway.ts`    | Konteks bootstrap gateway dan kontrak bootstrap  |
| `src/gateways/auth/guard.ts`      | Middleware `requireAuth`, `getAuthClaims`        |

## Konfigurasi

| Variabel                          | Default                      | Keterangan                                          |
| --------------------------------- | ---------------------------- | --------------------------------------------------- |
| `DB_TYPE`                         | `postgresql`                 | Backend database: `postgresql` atau `mariadb`       |
| `DATABASE_URL`                    | —                            | String koneksi untuk PostgreSQL atau MariaDB        |
| `COGNIS_ACCESS_TOKEN_TTL_SECONDS` | `43200`                      | Masa berlaku token Bearer dalam detik               |
| `COGNIS_MODULE_SOURCES_PATH`      | `config/module-sources.json` | Path persisten untuk konfigurasi sumber bursa modul |
| `PORT`                            | `3000`                       | Port HTTP                                           |

## Keterjangkauan

`GET /api/v1/system/healthcheck` segera mengembalikan `{ "data": { "status": "ok" } }` tanpa menjalankan pemeriksaan komponen. Endpoint ini dipakai untuk deteksi koneksi. `GET /api/v1/system/health` tetap menyediakan kesehatan komponen terperinci, cap waktu, dan waktu aktif. Komponen opsional yang lambat tidak boleh membuat server yang tersedia dianggap luring.

## Kesiapan rute luring

`offline:registerSessionRoutes(ids, signal, { available })` menerima predikat pemilik opsional yang dipanggil dengan rute dan jalur saat luring. Pembatalan sinyal menghapus deklarasi. Host menyiapkan kode publik dan gaya halaman secara terpisah melalui `offline:prepareRouteAssets`; `offline:areRouteAssetsReady` melaporkan penyelesaian. `createOfflineReadCache` menyediakan `read.has(key)`, dan klien HTTP tercakup menyediakan `request.hasCachedRead(path)`, tanpa mengembalikan data privat. Pemeriksaan mencakup identitas akun/sesi, kedaluwarsa, generasi cache, dan siklus hidup penyedia. Pemeriksaan ini tidak memberikan otorisasi atau menggantikan persetujuan dokumen hukum tersimpan.

## Login dan pengiriman tertunda

Pengiriman ulang dimulai di latar belakang hanya setelah otorisasi sesi dan persetujuan wajib berhasil. Kunci pengiriman browser terpisah mengurutkan pengiriman antar-tab; kunci penyimpanan singkat melindungi snapshot dan konfirmasi tanpa menunggu jaringan. Pembacaan dan perubahan tertunda baru tetap berjalan selama pengiriman lambat. Konfirmasi membaca ulang penyimpanan agar perubahan bersamaan tetap tersimpan. Antrean kosong tidak ditulis ulang saat autentikasi; halaman tanpa autentikasi tidak memperingatkan tentang buffer akun lain.

## Pemeriksaan dan peringatan

Tombol Periksa Ulang Koneksi pada banner Mode Luring segera memanggil `/api/v1/system/healthcheck`, menggabungkan pemeriksaan bersamaan, lalu mengotorisasi ulang sesi dan mencoba mengirim antrean jika server terjangkau. Persetujuan wajib tetap diperlukan. Kegagalan mempertahankan Mode Luring tanpa popup kesalahan. Tombol memakai gaya bersama dan indikator sibuk; Muat Ulang tersedia setelah pemulihan. Pemeriksaan otomatis tetap sekali setiap lima belas menit, sedangkan tindakan eksplisit dapat dilakukan lebih awal.

Peringatan tutup atau muat ulang bawaan hanya melindungi catatan baru dari halaman dan sesi saat ini. Setelah muat ulang sebenarnya, peringatan direset sementara antrean tetap disimpan untuk pengiriman ulang. Perubahan nyata yang baru mengaktifkannya lagi. Penanda Study yang dilihat dan analitik adalah aktivitas latar belakang tanpa peringatan. Catatan tab lain, catatan tersimpan sebelumnya, dan sekadar merender halaman tidak memicu peringatan. Penghentian penyedia tetap melindungi perubahan halaman saat ini sampai terkirim atau dihapus.

## Buka kunci dan pemuatan modul

Status terbuka bertahan saat halaman dimuat ulang dalam tab dan sesi terautentikasi yang sama. Kata sandi tetap mengenkripsi brankas; kata sandi maupun kunci dekripsi dalam teks biasa tidak disimpan. Penyimpanan sesi hanya memuat data buka kunci terenkripsi AES-GCM, dibungkus dengan kunci HKDF dari rahasia sesi aktif dan diikat pada origin, akun, instans akun server, serta identitas sesi. Server harus memverifikasi ikatan itu sebelum pemulihan. Batas waktu penguncian diautentikasi dan tetap absolut saat muat ulang. Kunci eksplisit, logout, perubahan akun/instans/sesi, dan kedaluwarsa membatalkan pemulihan. Menutup tab atau memulai sesi baru memerlukan buka kunci lagi. Cache IndexedDB lama yang menyimpan kunci tanpa enkripsi tetap dinonaktifkan.

Persiapan aset rute host mendaftarkan alur dan kapabilitas cache sekali per ctx bersama. Skrip bundel dan impor sumber dari modul eksternal memakai registrasi serta status rute yang sama, sehingga membuka Meetings tidak lagi gagal akibat duplikasi alur `offline:prepareRouteAssets`.

## Banner atas bersama

Host menyediakan `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` sebelum halaman atau penyedia dipasang. Deskriptor menerima `title` berupa teks biasa, `bodyHtml` yang disanitasi, `actionsHtml` tepercaya, serta varian `info`, `success`, `warning`, atau `danger`. Hasilnya memiliki `element` dan `remove()`. ID yang sama hanya mengganti pemberitahuan pemiliknya; pembersih lama tidak menghapus penggantinya. Ikat masa hidup dengan `signal`; prioritas lebih kecil tampil dahulu. Judul di-escape dan pemanggil wajib menyanitasi teks kaya.

Mode Luring dan Broadcast memakai satu tumpukan lengket di bagian paling atas dokumen, di atas header aplikasi. Mode Luring mendapat prioritas, tidak dapat ditutup, dan tetap menyediakan Periksa Ulang Koneksi serta Muat Ulang setelah pulih. Menghapus pengumuman tidak menghapus Mode Luring. Broadcast melewati permintaan jaringan saat terputus; penyedianya membersihkan banner dan pengatur waktu ketika dilepas.

## Halaman Study luring kosong

Halaman Study yang sudah disiapkan tetap dapat dibuka dalam sesi luring terverifikasi dengan persetujuan wajib meskipun snapshot konten privat belum ada. Metadata bahasa atau preferensi yang hilang menghasilkan navigasi kosong. Explore memasang tampilan kosong normal dan menampilkan “Tidak ada konten luring tersimpan yang tersedia” alih-alih kesalahan rute atau toast kesalahan. Flashcards juga mempertahankan halaman kosong jika data dek atau sumber tampilan wajib belum tersedia. Pemberitahuan terikat halaman saat ini dan tidak diduplikasi. Kekurangan cache tidak menyembunyikan penolakan akses atau persetujuan. Library dan Flashcards menyiapkan terjemahan publik serta templat ringan saat daring; data privat tetap berada dalam cache tab yang dibatasi.

## Pemuatan Langsung dan Gaya

Pemuatan langsung dan penyegaran mempertahankan gaya halaman saat aset luring disiapkan. Build host dan komponen mempertahankan identitas sumber lembar gaya, dan URL logis serta URL hasil build berbagi kepemilikan. Respons aset tidak lagi menunggu penulisan cache di latar belakang; kegagalan dicatat tanpa menunda pengiriman. Font web dimuat terpisah dari tema, sehingga server font yang tidak tersedia tidak menghalangi halaman atau indikator pemuatan. Font pilihan tetap diterapkan saat tersedia, dengan font pengganti browser yang sudah ada selama pemuatan.

## Persiapan Aset Publik

Host menyediakan `ctx.capabilities.get("offline:assets")` dengan `prepare(paths, { signal })` dan `register(paths, { signal })`. Keduanya menggunakan alur bertahap `offline:prepareAssets`. Pendaftaran memulai persiapan latar belakang, mencoba kembali saat koneksi atau preferensi berubah, dan mengembalikan fungsi coba lagi. Hanya jalur publik relatif akar `/static/` atau `/assets/` yang diterima; permintaan tidak mengirim kredensial dan menolak respons private/no-store. Empat pekerja membaca isi respons. Permintaan bersamaan digabung per sinyal pemilik, kegagalan dapat dicoba kembali, dan pembatalan pemilik menghentikan pekerjaan serta pendengar. Fasilitas ini tidak menyimpan data API pribadi dan tidak memberikan akses luring. Callback `restoreRead` pada klien HTTP luring hanya berjalan setelah cache tidak ditemukan dengan akses yang sah dan menggunakan pembaca snapshot terlindungi yang sama. Penolakan akses tidak pernah diubah menjadi tampilan kosong atau antrean.

Persiapan tetap diam ketika Mode Luring dinonaktifkan, koneksi terputus, atau persetujuan wajib belum dipenuhi. Pendaftaran juga mencoba kembali setelah pembaruan persetujuan dan perubahan pengendali worker. Pekerjaan berhasil dibatasi pada pemilik dan worker saat ini; persiapan tanpa pengendali tidak menghalangi persiapan ulang ketika worker mengambil kendali.

## Hasil Antrean Tersimpan

Setelah perubahan disimpan dalam antrean, kegagalan pencatatan aktivitas opsional atau penyegaran tampilan tidak mengubahnya menjadi perubahan gagal. Kalender membuka detail dari daftar acara tersimpan, termasuk acara baru dalam antrean dan suntingan berikutnya. Pengiriman acara bersamaan berbagi satu permintaan. Pesan hanya menghapus draf setelah pengakuan server atau penyimpanan; kegagalan penyegaran ruang tidak membatalkan bukti tersebut. Teks profil, postingan, dan gambar juga mempertahankan hasilnya jika penyegaran tampilan gagal. Penyegaran ketersediaan tidak menghambat perubahan Kalender yang sudah selesai.

Kegagalan siklus hidup penyedia kini mencatat jalur skrip tanpa data kueri dan tahap impor atau pemasangan yang gagal. Kegagalan aktivitas opsional dicatat terpisah dari tindakan pengguna yang telah disimpan.

## Ketersediaan Luring

Registri rute luring bertahan pada impor berulang dari bundel maupun berkas langsung. Deskriptor rute yang dibentuk ulang mempertahankan ketersediaan jika skrip, gaya, dan penyedia kapabilitas tetap sama; aset yang berubah harus disiapkan ulang. Pesan menyiapkan daftar ruang, terjemahan, dan katalog emoji setelah login terverifikasi. Halaman dapat dibuka luring sebelum kunjungan daring pertama. Hanya ruang dan riwayat tersimpan yang dibuka otomatis; memilih riwayat yang belum tersimpan menampilkan toast informasi khusus. Explore mempertahankan koleksi tersimpan yang tersedia jika koleksi lain atau penanda sudah dilihat tidak ditemukan. Penolakan akses dan persetujuan tetap diteruskan. Tindakan banner ditempatkan langsung dalam baris tindakan bersama sehingga pergeseran vertikal bawaan hilang.

## Favorit Study Bersama

Penyedia Study menyediakan `study:favourites` dengan operasi `load`, `toggle`, dan `has` yang mengikuti masa hidup penyedia. Utilitas tampilan memakai kapabilitas ctx ini, bukan cache terpisah per pemuat. Favorit disiapkan setelah autentikasi terverifikasi, menerapkan perubahan tertunda, dan berbagi keadaan terikat akun/sesi antara Explore, kartu belajar, dan impor berulang. Jika snapshot favorit opsional belum tersedia, pilihan kosong tetap menerapkan perubahan dalam antrean tanpa menyembunyikan konten atau menampilkan toast gagal memperbarui. Pergantian akun mengosongkan pilihan yang terlihat. Penolakan akses tidak pernah dianggap sebagai cache yang tidak ditemukan.

## Sumber Daya Publik Tersimpan

Gaya bersama, termasuk toast dan kontrol visibilitas rahasia, disertakan dalam manifes awal worker dalam bentuk URL logis dan hasil build. Calendar menyiapkan lembar gaya status yang dimuat tertunda melalui penyedianya. Katalog rute SPA dibagikan melalui ctx antara impor bundel dan berkas langsung sehingga rute Study yang diizinkan tetap tersedia saat pemuat lain pertama kali membaca katalog secara luring. Cuplikan halaman privat tetap terikat akun dan sesi; pemeriksaan izin serta persetujuan tetap berlaku.

Aset publik tersimpan langsung dikembalikan. Pemeriksaan latar belakang sesuai permintaan digabungkan dan dibatasi. Isi respons lengkap dibandingkan sebelum penggantian; data yang tidak berubah dipertahankan. Respons dengan tanggal Last-Modified lebih lama tidak dapat mengganti berkas yang lebih baru. Berkas hilang, kegagalan koneksi, isi terpotong, dan kegagalan penulisan cache mempertahankan berkas lengkap sebelumnya. Respons berubah menggantikannya hanya setelah penulisan cache atomik berhasil. Penolakan akses eksplisit, respons private/no-store, perubahan persetujuan, dan pencabutan akses modul tetap menerapkan kebijakan. Respons API dan dokumen terautentikasi tetap hanya melalui jaringan pada worker.

## Cache Aset Persisten

Worker menyiapkan seluruh bundel halaman publik, chunk dinamis, gaya, dan media hasil build tanpa menjalankan halaman atau mengambil data privat. Respons publik yang diambil kemudian disimpan otomatis. Aktivasi worker membawa berkas publik lengkap ke generasi baru sebelum menghapus penyimpanan lama; hanya revisi modul yang diizinkan katalog saat ini yang dapat dipertahankan. Bundel publik dapat diunduh tanpa kunjungan halaman. Konten privat tetap memerlukan cuplikan terotorisasi yang disiapkan penyedia pemiliknya.

## Ruang Kerja Luring

Setelah masuk terverifikasi, Study menyiapkan skema, lokasi yang dapat dibaca, formulir, penanda dilihat, dan koleksi ringan yang diizinkan untuk bahasa belajar serta mengajar yang diikuti. Flashcards menyiapkan daftar dan hingga 80 dek yang sesuai beserta detail kartu dalam batas cache yang ada. Perubahan keikutsertaan memicu persiapan ulang. Dua worker membatasi pembacaan bersamaan; penghentian penyedia, pergantian akun, penolakan akses, dan persetujuan hukum tersimpan tetap diberlakukan. Halaman tidak perlu dikunjungi sebelumnya; cuplikan privat tetap terikat tab dan sesi terverifikasi.

Akses Profil luring memerlukan cuplikan profil sendiri yang lengkap: teks, postingan, koneksi, preferensi, serta gambar avatar dan banner terbatas. Profil pengguna lain diblokir meskipun pernah tersimpan. Administration, Modules, Users, dan Shares tetap tidak tersedia luring. Settings membuka kontrol inti lokal; perubahan font, tema, bahasa, zona waktu, dan tampilan diterapkan lokal dan diantrekan untuk server. Verifikasi email, tindakan akun, serta pengaturan tambahan yang memerlukan server tetap tidak tersedia luring.

Peringatan tutup atau muat ulang bawaan hanya melindungi catatan baru dari halaman dan sesi saat ini. Setelah muat ulang sebenarnya, peringatan direset sementara antrean tetap disimpan untuk pengiriman ulang. Perubahan nyata yang baru mengaktifkannya lagi. Penanda Study yang dilihat dan analitik adalah aktivitas latar belakang tanpa peringatan. Catatan tab lain, catatan tersimpan sebelumnya, dan sekadar merender halaman tidak memicu peringatan. Penghentian penyedia tetap melindungi perubahan halaman saat ini sampai terkirim atau dihapus.

Host menyediakan `ui:languageCatalog.load` melalui ctx dan menyiapkan katalog bahasa bersama setelah masuk terverifikasi. Katalog bahasa inti disertakan dalam kumpulan awal publik. Settings dan bilah navigasi memakai pembacaan yang sama dengan lingkup siklus hidup. Menyimpan preferensi bahasa secara luring mempertahankan halaman yang berfungsi dan menerapkan preferensi pada navigasi klien berikutnya.

## Latihan Study Luring

Pengelolaan Library serta halaman pengeditan, pencarian, dan permintaannya memerlukan koneksi. Beranda Study dan submenu menyembunyikan tautan tersebut saat luring, termasuk segera setelah koneksi terputus. Explore tetap tersedia untuk membaca konten tersimpan dan menggambar. Penyedia Library hanya mendaftarkan Explore sebagai rute sesi luring.

Persiapan bahasa yang diikuti menyimpan katalog skema bersama selain katalog tiap bahasa. Menggambar dan Flashcards dapat memakai pembacaan skema biasa tanpa kunjungan halaman daring sebelumnya. Flashcards menyiapkan terjemahan Share dan Study serta templat galeri, lalu membaca koleksi bahasa terpilih dengan permintaan berskema yang sama seperti persiapan keikutsertaan. Dek yang disiapkan dapat membuka galeri dan latihan luring. Audio, pengambilan kamus, pengeditan konten, serta pemeriksaan akses dan persetujuan tetap mengikuti pembatasan yang ada.
