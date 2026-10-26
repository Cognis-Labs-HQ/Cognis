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

Analitik latar belakang tetap diantrekan tetapi tidak mengaktifkan peringatan penutupan. Pemilik memilih `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; nilai bawaan tetap melindungi perubahan pengguna. Rekaman baru menyimpan klasifikasinya agar pelepasan penyedia dan muat ulang tidak menganggap telemetri sebagai edit. Rekaman lama memakai deklarasi pemilik aktif; pemilik tak dikenal tetap dilindungi. Sinkronisasi zona waktu otomatis memakai `saveUiPreferences(patch, { bufferOffline: false })`; klien HTTP berskop menolaknya saat luring alih-alih mengantrekannya. Pengaturan eksplisit, pesan, dan edit Kalender tetap diantrekan dan memicu peringatan.

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
