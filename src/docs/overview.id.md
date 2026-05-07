# Ikhtisar Cognis

## Ikhtisar

Cognis adalah platform belajar bahasa modular yang dirancang untuk pelajar mandiri, guru, dan komunitas. Platform ini menggabungkan konten pembelajaran terstruktur dengan fitur sosial, kesiapan kolaborasi real-time, dan arsitektur backend yang sangat dapat diperluas. Tujuannya adalah mempermudah penerapan lingkungan belajar bahasa yang di-host sendiri yang dapat berkembang dari satu pengguna hingga komunitas penuh tanpa mengubah basis kode inti.

Platform ini dibangun di sekitar arsitektur gateway-first: setiap subsistem utama (autentikasi, notifikasi, profil, penyimpanan file, pencatatan) adalah gateway yang memiliki rute, adapter, kontribusi UI, pengujian, dan dokumentasinya sendiri. Inti aplikasi mendefinisikan kontrak dan kebijakan; inti tidak pernah mengimpor kode gateway atau adapter konkret. Pemisahan ini berarti Anda dapat menambahkan backend basis data baru, mengganti penyedia autentikasi, atau menghapus subsistem sepenuhnya dengan mengubah konfigurasi, bukan dengan mengedit kode bersama.

Adapter adalah implementasi spesifik penyedia dari antarmuka gateway. Setiap gateway menemukan adapter-nya saat startup dengan memindai direktori yang diketahui daripada mempertahankan daftar impor statis. Hasilnya adalah menambahkan adapter baru — misalnya, adapter penyimpanan file berbasis S3 — hanya memerlukan penempatan direktori adapter di lokasi yang benar; server merakit set kemampuan penuh dari apa yang ada.

Modul memperluas platform dengan fitur opsional: tipe konten, kurikulum, analitik, atau integrasi. Seperti gateway, modul bersifat mandiri dan ditemukan secara otomatis. Mereka menyumbangkan CSS, template HTML, dan perilaku JavaScript ke UI melalui kontrak frontend yang ditentukan, dan mendaftarkan rute API mereka sendiri melalui mekanisme terlindungi yang mencegah konflik dengan namespace inti.

## Tanggung Jawab

- Menyediakan fondasi platform: server HTTP, autentikasi, persistensi, penyimpanan file, pencatatan, dan pengiriman notifikasi.
- Mendefinisikan pola gateway/adapter dan capability store yang menghubungkan gateway bersama.
- Menghosting shell UI, page composer, dan infrastruktur i18n.
- Mengelola siklus hidup modul: penemuan, pengaktifan, dan keamanan rute.
- Menyajikan browser dokumentasi dalam aplikasi dari direktori `docs/` yang ditemukan secara otomatis.

Tidak bertanggung jawab atas: logika penyedia auth tertentu (adapter), SQL basis data tertentu (adapter), transport notifikasi tertentu (adapter), atau konten yang dikirimkan oleh modul.

## Arsitektur

### Model lapisan

```
core/            — kontrak, antarmuka, layanan kebijakan
gateways/        — orkestrator domain (auth, db, notify, profile, files, logging)
adapters/        — implementasi penyedia konkret (sqlite, ldap, smtp, dll.)
modules/         — ekstensi fitur opsional
api/             — server HTTP, registri rute, lapisan permintaan/respons
ui/              — frontend browser (halaman, tata letak, utilitas reuse, gaya)
```

Core mendefinisikan `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore`, dan antarmuka lainnya di `src/core/contracts/`. Gateway mengimpor dari core; core tidak pernah mengimpor dari gateway. Ketergantungan satu arah ini adalah invarian arsitektur utama.

Setiap gateway memiliki fungsi `bootstrap(ctx)` yang menerima `GatewayBootstrapContext`. Konteks menyediakan akses ke capability store (`ctx.capabilities`), registri rute (`ctx.routeRegistry`), registri gateway (`ctx.gatewayRegistry`), dan eksekutor basis data serta tipe saat ini. Gateway menyumbangkan kemampuan ke store (`ctx.capabilities.contribute('key', value)`) dan gateway lain mengambilnya (`ctx.capabilities.get('key')`).

### Capability store

Capability store adalah mekanisme injeksi yang menghubungkan gateway tanpa impor langsung. Misalnya, gateway pencatatan membaca `file:append` dari capability store (disumbangkan oleh gateway files) dan meneruskannya ke Logger sehingga penulisan log melalui abstraksi gateway file. Gateway profil membaca `file:gateway` (juga dari files) untuk menangani unggahan avatar.

### Penemuan otomatis

Gateway ditemukan dengan memindai `src/gateways/` saat startup. Setiap direktori gateway berisi `bootstrap.ts` dan `manifest.json`. Server memuat gateway dalam urutan ketergantungan yang ditentukan oleh bidang `requires` di setiap manifes.

Adapter ditemukan oleh setiap gateway dengan memindai `src/adapters/<gateway-id>/` pada waktu bootstrap-nya sendiri. Baik core maupun server tidak memiliki pengetahuan tentang adapter mana yang diinstal.

Modul ditemukan dari `src/modules/` (internal, tepercaya) dan `COGNIS_MODULES_ROOT/external` (arsip eksternal, memerlukan pengakuan pengaktifan eksplisit). Mekanisme file pointer (symlink nginx-style `<id>.load`) mengontrol modul mana yang aktif.

### Lokasi sumber utama

| Area | Jalur |
| ---- | ----- |
| Kontrak inti | `src/core/contracts/` |
| Layanan inti | `src/core/services/` |
| Entri server HTTP | `src/api/main.ts` |
| Registri rute | `src/api/route-registry.ts` |
| Utilitas bersama gateway | `src/gateways/shared.ts` |
| Bootstrapper gateway | `src/api/gateway-bootstrap.ts` |
| Titik entri UI | `src/ui/app/` |
| Utilitas reuse UI | `src/ui/reuse/` |
| Dokumen platform | `src/docs/` |

## Titik Ekstensi

Cognis diperluas melalui tiga mekanisme:

- **Gateway**: tambahkan direktori di bawah `src/gateways/` dengan `bootstrap.ts` dan `manifest.json`. Server akan mendeteksinya secara otomatis.
- **Adapter**: tambahkan direktori di bawah `src/adapters/<gateway-id>/`. Gateway yang memilikinya akan menemukan dan memuatnya.
- **Modul**: tempatkan direktori modul di bawah `src/modules/` (internal) atau arsip modul di bawah jalur eksternal yang dikonfigurasi. Aktifkan melalui UI admin atau `cognisctl`.
