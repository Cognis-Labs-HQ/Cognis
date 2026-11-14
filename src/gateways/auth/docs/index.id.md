# Gateway Autentikasi

## Ikhtisar

Gateway Autentikasi adalah titik masuk tunggal untuk semua operasi login dan identitas di Cognis. Gateway ini memisahkan platform dari penyedia autentikasi tertentu dengan menempatkan dirinya di antara route handler dan adapter autentikasi konkret. Mengganti penyedia autentikasi — dari kata sandi lokal ke LDAP atau SAML — hanya membutuhkan pengaktifan adapter baru melalui API admin; tidak ada route handler atau layanan inti yang perlu diubah.

Gateway menemukan adapter dengan memindai `src/adapters/auth/` saat bootstrap. Setiap direktori adapter harus mengekspor fungsi `createAdapter()`. Adapter lokal selalu dimuat pertama dan diperlakukan secara khusus karena mendukung perintah CLI `user:*` dan alur pembuatan akun admin awal. Semua adapter lainnya dimuat dari direktori mereka dan dapat diaktifkan atau dinonaktifkan saat runtime oleh admin tanpa me-restart server.

## Tanggung Jawab

- Menemukan dan mendaftarkan semua adapter autentikasi dari `src/adapters/auth/` saat bootstrap.
- Mengelola status aktif/nonaktif adapter yang dipersistensikan di `auth_adapter_configs`.
- Memverifikasi kredensial dengan mendelegasikan ke adapter yang diaktifkan untuk penyedia yang diminta.
- Menerbitkan token akses setelah autentikasi berhasil melalui `issueAccessToken`.
- Menyediakan kumpulan kapabilitas terdokumentasi: `auth:accountStore`, `auth:createLocalAdmin`, `auth:getLoginMethods`, `auth:registerProvider`, `auth:registerLoginButton`, `auth:registerPageScriptOrigins`, `auth:issueAccessToken`, `auth:getAuthClaims`, `auth:requireAuth`, `auth:requireRoleAccess`, `auth:revokeAccessTokensForSubject`, `auth:revokeSetupPendingAccessTokens`, dan `auth:routeContext`.
- Mendaftarkan semua route API autentikasi dan route admin adapter.

Tidak bertanggung jawab atas: menyimpan data profil pengguna (itu tugas gateway profil), manajemen sesi di luar penerbitan token, atau logika bisnis non-autentikasi.

### Siklus hidup penyedia runtime

Penyedia runtime harus memakai gateway Authentication sebagai otoritas konfigurasi dan status daya, sama seperti LDAP. Penyedia memberikan `id` yang stabil, `getConfigSchema()`, `configure(config)`, dan `isConfigured()`; Administration membaca dan menulis `/api/v1/gateways/auth/adapters/<id>/config` serta mengaktifkan atau menonaktifkan melalui `/enable` atau `/disable`. Modul tidak boleh menyimpan bendera aktivasi kedua atau menganggap aktivasi modul sama dengan aktivasi adapter.

Saat bootstrap, tunggu `auth:registerProvider(provider, requires)` sebelum mendaftarkan rute atau tampilan login. Promise selesai hanya setelah Cognis memulihkan konfigurasi tersimpan dan status aktif adapter. Daftarkan tombol bermerek setelah itu, simpan kedua fungsi pembersihan, lalu hapus tombol sebelum membatalkan pendaftaran penyedia saat teardown. Penyedia tanpa status aktif tersimpan mulai dalam keadaan nonaktif dan harus menyelesaikan penyiapan melalui alur konfigurasi adapter milik gateway.

## Arsitektur

Kelas utama adalah `CoreAuthGateway` di `src/gateways/auth/gateway.ts`. Kelas ini menyimpan peta adapter terdaftar, kumpulan ID adapter yang diaktifkan, dan referensi ke adapter lokal (yang disambungkan secara terpisah melalui `setLocalAdapter()`).

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): () => boolean;
  setLocalAdapter(adapter: AuthProviderAdapter & { ... }): void;
  async discoverAdapters(authAdaptersRoot: string): Promise<void>;
  async loadPersistedConfigs(): Promise<void>;
  async getEnabledAdapter(id: string): Promise<AuthProviderAdapter | null>;
  async getAdapter(): Promise<AuthProviderAdapter | null>;
  async authenticate(credentials: Record<string, unknown>, providerId?: string): Promise<AuthContext | null>;
  async createLocalAdmin(username: string, password: string): Promise<AuthContext>;
  async getLoginMethods(): Promise<AdapterInfo[]>;
}
```

`getEnabledAdapter(id)` mengembalikan adapter tertentu berdasarkan ID hanya jika saat ini diaktifkan. `getAdapter()` (tanpa argumen) mengembalikan adapter pertama yang diaktifkan. Keduanya mengembalikan `null` jika tidak ada adapter yang sesuai.

`registerAdapter()` mengembalikan fungsi pembersihan penyedia yang digunakan oleh disposer modul. Pemanggilannya menghapus tepat satu pendaftaran penyedia tersebut beserta status aktif dan metadata dependensinya. Jika penyedia lain telah menggantikan ID yang sama, pembersihan tidak menghapus penggantinya. Pembersihan ini diperlukan karena penonaktifan modul harus menghapus setiap kapabilitas yang disumbangkannya.

Bootstrap di `src/gateways/auth/bootstrap.ts` dan `src/gateways/auth/bootstrap/`:

1. Menginstansiasi `DbLocalAccountStore` dari `src/adapters/auth/local/store.ts`.
2. Menginstansiasi `CoreAuthGateway` dengan DB executor dan tipe.
3. Memuat adapter lokal melalui `setLocalAdapter()`.
4. Memanggil `discoverAdapters(authAdaptersRoot)` untuk memuat semua adapter lainnya.
5. Memanggil `loadPersistedConfigs()` untuk memulihkan status aktif/nonaktif dari database.
6. Menjalankan hook capability/bootstrap dari `src/gateways/auth/bootstrap/`.
7. Mendaftarkan route dan capability.

Capability yang disediakan:

| Capability                       | Tipe                                           | Keterangan                                                                          |
| -------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `auth:accountStore`              | `LocalAccountStore`                            | Store akun lokal yang digunakan oleh adapter lokal                                  |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | Membuat akun admin jika belum ada                                                   |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | Mengembalikan metadata untuk semua penyedia yang diaktifkan                         |
| `auth:registerProvider`          | `async (provider, requires?) => dispose`       | Mendaftarkan penyedia autentikasi modul dan mengembalikan fungsi pembersihannya     |
| `auth:registerLoginButton`       | `(descriptor) => dispose`                      | Mendaftarkan tampilan tombol masuk bermerek dan mengembalikan fungsi pembersihannya |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | Mengganti origin skrip http(s) tepercaya untuk satu pemilik di header CSP halaman   |

Penyedia autentikasi harus menunggu `auth:registerProvider` sebelum memanggil `auth:registerLoginButton`. Registrasi memulihkan konfigurasi tersimpan dan status aktif adapter sebelum selesai, selaras dengan penyedia yang ditemukan dari sistem berkas seperti LDAP. Deskriptor mewajibkan `providerId` yang terdaftar, `label` lengkap yang telah dilokalkan, dan `iconUrl` dari asal yang sama. Nilai opsional `backgroundColor`, `borderColor`, dan `textColor` memakai warna heksadesimal enam digit. Halaman masuk selalu menampilkan ikon dan label lengkap pada ukuran layar ringkas maupun lebar. Penyedia harus memanggil fungsi pembersihan yang dikembalikan saat kontribusinya dinonaktifkan. Metode tanpa kredensial yang tidak bergaya dihilangkan, bukan ditampilkan sebagai tombol masuk generik.

Pengalihan OAuth yang menghadap browser dapat menggunakan `/sso/<routeNamespace>/<path>`. Cognis meneruskan callback berbasis kueri langsung ke penyedia dan menjembatani respons berbasis fragmen ke callback milik server yang sama tanpa membiarkan indikator pemuatan terus aktif. Kegagalan callback kembali ke Login dengan galat yang dilokalkan.

Penyedia dapat mendeklarasikan `routeNamespace` dan `registerRoutes(router)` pada adapternya. Router menerima jalur `GET` dan `POST` relatif terhadap `/api/v1/auth/<routeNamespace>` agar callback OAuth dapat berada di bawah gateway Autentikasi tanpa memberi modul kontributor akses langsung ke rute inti yang dilindungi. Namespace dibatasi pada segmen URL yang aman, namespace inti Autentikasi dicadangkan, rute duplikat ditolak, dan penghapusan penyedia menghapus semua rute kontribusinya.

Sesi penyedia eksternal melewati `gateAccountCreation` sebelum `ensureExternalAccount`. Adapter pendaftaran publik yang aktif mengizinkan pembuatan akun SSO secara terpisah dari kebijakan pendaftaran akun lokal publik. Jika tidak, Cognis menyimpan identitas terautentikasi yang belum dikenal di balik ID percobaan buram yang kedaluwarsa dan mengembalikan `account_creation_required` dengan `registrationUrl`. Penyedia mengalihkan pengguna ke URL itu. Adapter Token Pendaftaran menambahkan otorisasi pada kerangka pendaftaran standar dan melanjutkan identitas yang ditahan tanpa mengekspos status panggilan balik penyedia.

## Route API

| Metode | Path                                         | Keterangan                                      | Autentikasi      |
| ------ | -------------------------------------------- | ----------------------------------------------- | ---------------- |
| `GET`  | `/api/v1/auth/login-methods`                 | Daftar penyedia autentikasi yang diaktifkan     | Tidak diperlukan |
| `POST` | `/api/v1/auth/register`                      | Mendaftar akun lokal baru secara mandiri        | Tidak diperlukan |
| `POST` | `/api/v1/auth/login`                         | Autentikasi; mengembalikan token Bearer         | Tidak diperlukan |
| `POST` | `/api/v1/auth/sso/start`                     | Memulai pengalihan otorisasi penyedia eksternal | Tidak ada        |
| `POST` | `/api/v1/auth/verify`                        | Verifikasi kata sandi pengguna saat ini         | Pengguna         |
| `GET`  | `/api/v1/gateways/auth/adapters`             | Daftar semua adapter autentikasi terdaftar      | Admin            |
| `GET`  | `/api/v1/gateways/auth/adapters/:id/config`  | Mendapatkan skema konfigurasi untuk adapter     | Admin            |
| `PUT`  | `/api/v1/gateways/auth/adapters/:id/config`  | Memperbarui konfigurasi untuk adapter           | Admin            |
| `POST` | `/api/v1/gateways/auth/adapters/:id/test`    | Menguji konfigurasi adapter                     | Admin            |
| `POST` | `/api/v1/gateways/auth/adapters/:id/enable`  | Mengaktifkan adapter                            | Admin            |
| `POST` | `/api/v1/gateways/auth/adapters/:id/disable` | Menonaktifkan adapter                           | Admin            |

Kegagalan uji adapter dapat menyertakan objek `error.fieldErrors` yang memetakan sejumlah ID kolom konfigurasi ke pesan diagnosis yang aman.

Daftar adaptor dan kontrak konfigurasi menyertakan `stringsBaseUrl` ketika adaptor memiliki sumber daya Administrasi yang dilokalkan.

## Bootstrap keyring peramban

Gateway Autentikasi memuat adapter keyring wajib sebelum mendaftarkan hook alur sesi peramban. Karena itu, setiap pemuatan halaman langsung dan penyegaran dapat memulihkan kunci sesi tab saat ini yang tidak dapat diekstrak secara otomatis. Jika pemulihan tidak tersedia, penyelesai konten terlindungi pertama membuka dialog buka kunci keyring kontekstual.

## Penerusan kegagalan berbagi

Hasil sesi peramban mempertahankan alasan kegagalan autentikasi alternatif yang netral agar halaman sumber daya publik dapat membedakan sumber daya yang hilang dari status tidak tersedia lainnya tanpa mengimpor internal Autentikasi.

Perubahan sumber autentikasi menjalankan alur `reconcile-auth-sources` setelah penyimpanan. Hook adaptor menggunakan tahap `reconcile-accounts` untuk mencabut sesi dan merekonsiliasi identitas milik sumber tanpa percabangan penyedia di route.

## Batas sesi peramban

Pembatalan konfirmasi kata sandi hanya berjalan untuk sesi akun penuh yang terautentikasi. Penyiapan halaman anonim dan tamu Share dapat mengunci atau mengganti status keyring tanpa mengirim permintaan khusus akun `DELETE /api/v1/auth/verify`.

## Penyedia profil eksternal

Modul SSO dapat mendaftarkan `auth:registerExternalProfileProvider` melalui CTX. Resolver menerima ID penyedia, ID akun Cognis, ID pengguna eksternal, dan sesi penyedia terautentikasi, lalu dapat mengembalikan handle yang dapat dicari, nama tampilan, bio, lokasi, situs web, serta data avatar dan banner. Cognis juga memakai `handle` atau `username` dari sesi penyedia sebagai handle profil awal bila tersedia, alih-alih menampilkan ID akun eksternal yang buram sebagai nama pengguna. Adapter Profil menyimpan data tersebut melalui kemampuan penyimpanan miliknya saat akun eksternal pertama kali dibuat. Nilai `profileVisibility` yang valid (`hidden`, `private`, `friends`, atau `community`) disimpan sebagai visibilitas profil baru.

### Sinkronisasi profil eksternal

Integrasi autentikasi eksternal dapat menyediakan kueri CTX `auth:syncExternalProfile`. Kueri menerima `{ providerId }` untuk akun yang terautentikasi, memperbarui profil milik penyedia melalui `auth:resolveExternalProfile`, lalu selesai hanya setelah Cognis menyimpan handle, kolom tampilan, data avatar, dan data banner melalui kapabilitas Profil dan Berkas. URL gambar penyedia hanya menjadi masukan integrasi; kueri harus mengembalikan data media agar antarmuka peramban selalu menampilkan berkas milik Cognis. Di peramban, integrasi memanggil `auth:registerExternalProfileSynchronizer` dengan ID penyedia dan fungsi sinkronisasinya. Registri milik Autentikasi hanya menampilkan tindakan untuk penyedia saat ini sehingga integrasi lain yang terpasang tidak dapat menangani atau menimpa profil akun yang salah.

### Identitas eksternal yang dihapus

Penghapusan akun yang diautentikasi secara eksternal menyimpan sidik jari satu arah dari identitas penyedianya sebelum data milik akun dihapus. Autentikasi penyedia yang berhasil kemudian menghapus catatan penghapusan tersebut secara transaksional saat membuat ulang akun, sesuai dengan perilaku autentikasi berbasis direktori. Autentikasi yang gagal tidak dapat menghapus catatan, dan sidik jari tidak diekspos kepada klien peramban.

### Nama akun berlingkup penyedia

Akun eksternal baru memakai ruang nama penyedia pada kunci akun lokal dan handle profil. Sesi penyedia untuk handle `firehawksystems` dengan `accountNamespace` bernilai `x` menjadi `x:firehawksystems`; akun lokal `firehawksystems` dan identitas seperti `line:firehawksystems` tetap terpisah. Pemetaan `(provider, external_user_id)` yang sudah ada tetap menjadi acuan pada proses masuk berikutnya meskipun handle penyedia berubah.

## Kebijakan media peramban

Halaman terautentikasi mengizinkan media dari rute dengan asal yang sama dan URL `blob:` yang dibuat peramban. Dengan demikian, klien UI tepercaya dapat memutar respons audio terautentikasi tanpa mengizinkan sumber media jarak jauh yang sewenang-wenang.

### Integrasi siklus hidup modul

`auth:registerKeyringDataOwner(ownerId, purge)` adalah kapabilitas server publik. ID pemilik duplikat ditolak dan disposer memeriksa identitas registrasinya. Modul memakai `module:<id>` dan memasang disposer dengan `ctx.registerDisposer`; purge menerima ID akun ternormalisasi. Bersihkan hanya keadaan yang bergantung pada keyring sambil mempertahankan identitas akun serta sumber daya bersama lainnya.

## Penyiapan Sesi

Setiap sesi terautentikasi memeriksa `/api/v1/auth/setup-status`, termasuk sesi SSO yang dipulihkan. Auth memiliki `auth:getSetupIntegrations(accountId, role)` dan mengevaluasi mode validasi terdaftar. Penyedia menyediakan skrip asal sama yang mengekspor `enforceSetup({ accountId })`. Penyiapan wajib selesai sebelum navigasi atau penggunaan offline; penyedia tidak tersedia tidak membatalkan kebijakan. Pemulihan administrator pendiri tetap dikecualikan.

## Indikator Login

Permintaan kredensial, kode TFA, dan otorisasi SSO menampilkan roda pemuatan bersama dan menutupnya sebelum penyiapan interaktif. Pengiriman kredensial ganda diabaikan selama permintaan berlangsung. Pembersihan dan penyegaran cache luring publik berjalan di latar belakang setelah login. Waktu login terakhir tetap dicatat untuk SSO meskipun adapter autentikasi lokal dinonaktifkan.

## Privasi akun dan isolasi keyring

Akun SSO menggunakan ID acak yang tidak mengungkap identitas penyedia. ID penyedia disimpan terpisah dan hanya ditampilkan kepada administrator; nama pengguna publik tidak memuatnya. Auth mencadangkan nama sebelum perubahan profil atau email: nama duplikat dari penyedia yang sama ditolak, sedangkan penyedia berbeda mendapat akhiran acak pendek bila perlu. Daftar pengguna dan endpoint tindakan membedakan `username` publik dari `accountId` internal.

Akun lokal yang sudah ada tetap berfungsi meskipun ada catatan SSO lama. Startup tidak memerlukan reset basis data. Login dan provisi akun SSO lama ditolak secara individual sampai akun tersebut dibuat ulang dengan ID opak. ID akun, hubungan, dan rapat tidak dimigrasikan atau dihapus secara otomatis.

## Login dan pengiriman tertunda

Setelah login kata sandi atau TFA berhasil, kapabilitas navigasi SPA yang sudah ada mengganti halaman login dengan Dashboard. Tab terverifikasi dan perubahan tertunda tetap tersedia tanpa memicu peringatan penutupan halaman dari browser. Indikator pemuatan tetap terlihat sampai navigasi selesai; sinkronisasi zona waktu opsional berjalan sesudahnya dan menolak pergantian akun. Peringatan tetap melindungi perubahan yang benar-benar tertunda saat tab terautentikasi ditutup atau dimuat ulang.

## Batas Sesi dan Komponen

Auth menyediakan `session:isOfflineValid` sebagai otoritas sinkron tanpa jaringan untuk akses luring terverifikasi. Pemeriksaan mencakup penyiapan yang selesai, akun dan token aktif, serta kedaluwarsa sesi. Pemilik antrean memakai kontrak ini alih-alih menafsirkan penyimpanan autentikasi sendiri. Penyiapan akun melewati sesi tamu alternatif; endpoint setup-status di server memakai kapabilitas klasifikasi Share sebelum meminta integrasi TFA atau email. Akun lokal dan SSO biasa tetap wajib menyelesaikan penyiapan.

## Antrean Terikat Akun

Catatan antrean menyertakan pengenal instans akun yang diverifikasi server. Auth mengembalikan `accountInstanceId` kanonis dalam status penyiapan terautentikasi dan hanya menyediakan `session:getOfflineIdentity` untuk sesi akun yang terverifikasi, selesai disiapkan, dan belum kedaluwarsa. Ketiadaan metadata otoritatif mencabut izin luring. Tampilan antrean serta pemeriksaan penyimpanan dan pengiriman terikat pada instans ini; catatan instans lama atau tanpa ikatan ditolak sebelum dikirim, termasuk setelah akun lokal dibuat ulang dengan ID akun yang sama. ID operasi tidak bertabrakan antarinstans akun. Token Bearer tidak pernah disimpan dalam antrean.

## Percobaan Pendaftaran SSO Terbatas

Identitas SSO yang memerlukan undangan ditahan sebelum akun, profil, atau surel dibuat. Percobaan yang dibatalkan atau kedaluwarsa tidak dapat dilanjutkan; pendaftaran dan autentikasi dua faktor kedaluwarsa tepat pada batas waktu. Adaptor pendaftaran publik yang aktif tetap mengizinkan pembuatan akun SSO secara terpisah dari pendaftaran akun lokal publik. Akun lama tidak dihapus berdasarkan penyedia atau usia.

## Mode Validasi Terdaftar

`auth:userValidationModes.register` menerima ID, label terjemahan, basis sumber opsional, bidang registrasi wajib, fungsi ketersediaan, fungsi validasi, dan integrasi penyiapan opsional. Registrasi hanya selama bootstrap dan mengikuti siklus hidup pemilik. Auth menjalankan fungsi terpilih melalui `auth:evaluateUserValidation` (`resolvePolicy`, `validateAccount`, `verifyResult`), tanpa percabangan berdasarkan ID metode. Kebijakan terkonfigurasi yang hilang atau tidak tersedia menolak akses. Pemulihan administrator pendiri tetap dikecualikan. Administration menampilkan metadata terdaftar; pilihan tersimpan yang tidak tersedia dipertahankan.

Registrasi kontrak adapter mengikuti [kontrak bootstrap gateway bersama](/docs/gateways).

## Kepastian Sesi Akhir

Kapabilitas milik Auth versi 1 `auth:login` menjalankan `auth:prepareLogin` (`authenticate`, `assessSession`, `authorizeSession`), lalu memanggil `auth:completeSession`. Alur utama `login` mengembalikan data persiapan `authenticated`, bukan token biasa; metadata akun tetap disiapkan bila diperlukan. Login selesai harus memanggil kapabilitas, bukan alur mentah. Rute produksi dan pengujian alur terdaftar memakai batas ini; verifikasi serta penyiapan TFA memanggil kapabilitas akhir. Ekstensi utama selesai sebelum penilaian dan penyelesaian.

`auth:completeSession` adalah kapabilitas server tepercaya versi 1. Tahap baca-saja `auth:prepareSession` (`validateAccount`, `validateLifecycle`, `authorizeSession`) memeriksa akun dan Profil opsional. Kedua alur persiapan menghormati penolakan yang dikembalikan maupun disimpan dalam data serta galat sebelum aktivasi. Setelah semua ekstensi selesai, Auth mengaktifkan profil dan menerbitkan sesi secara berurutan per akun tanpa kait kebijakan sesudahnya. Kegagalan penyedia Profil menghasilkan `session_unavailable`; instalasi tanpa Profil tetap didukung. Pencatatan login mengikuti verifikasi. Kepastian berasal dari percobaan milik komponen dan verifikasi faktor, bukan tanda penyelesaian dalam permintaan. Pemeriksaan siklus hidup menolak pekerjaan usang. Kegagalan penyelesaian mencabut hanya token biasa milik operasi tersebut. Penyimpanan lintas komponen tidak transaksional: aktivasi dapat tetap berlaku jika penulisan akhir tersimpan lalu gagal atau langkah penyelesaian berikutnya gagal setelah semua pemeriksaan berhasil. Auth tidak membatalkan perubahan profil lain. Faktor tertunda, tidak valid, atau ditinggalkan tidak mengaktifkan profil maupun meninggalkan token biasa.

TFA menyediakan kapabilitas versi 1 `tfa:assessSession` beserta alur bertahapnya. Gateway TFA aktif yang diketahui tetapi tidak memiliki penilaian yang berfungsi akan menolak login dengan aman. TFA yang sengaja tidak dipasang atau dinonaktifkan administrator tetap opsional. Pendaftaran aktif yang tersimpan tetap diwajibkan saat penyedia bermasalah, sementara kode pemulihan tetap tersedia. Penonaktifan administrator yang tersimpan secara eksplisit membebaskan kewajiban penyedia tersebut. Kesalahan metadata penerbit opsional tidak menghapus penyedia yang valid.

Verifikasi faktor dan penyelesaian penyiapan sama-sama memakai penyelesaian sesi milik Auth. `auth:consumePendingLoginAttempt` menghabiskan percobaan terautentikasi utama yang belum kedaluwarsa secara atomik setelah faktor berhasil diverifikasi; penyelesaian bersamaan atau berulang tidak dapat memakainya lagi. Verifikasi penyiapan juga mencegah penyelesaian bersamaan untuk penyiapan yang sama. Kegagalan penyelesaian tidak mengembalikan token biasa atau cookie; login kembali setelah penyebabnya diperbaiki. Pembersihan pemilik menghapus alur penilaian dan penyelesaian serta percobaan login tertunda; pekerjaan lama yang masih berjalan ditolak dengan aman. Kontrol dan urutan tutorial login serta penyiapan tetap sama; sesi yang tidak tersedia menggunakan notifikasi kesalahan terjemahan.

## Batas Autentikasi Bertipe

Deklarasi Auth dan TFA kini menjelaskan peran akun, bidang identitas eksternal, perintah basis data, dan proyeksi sesi kuki yang sudah ada. Validasi batas waktu sesi tetap menerima nilai angka yang sama. Jaminan masuk dan percobaan faktor sekali pakai tidak berubah.

## Siklus token terbatas

Format token tersimpan 2 mewajibkan kolom keamanan eksplisit dan menolak format yang tidak didukung serta rekaman cacat atau ambigu. Sesi yang ditolak harus masuk kembali; tidak ada konversi format otomatis. Kredensial normal, terbatas, dan dicabut yang valid mempertahankan kewenangannya setelah mulai ulang. Kegagalan penyimpanan token dilaporkan, bukan diakui sebagai penulisan yang berhasil.

Kapabilitas auth:revokeSetupPendingAccessTokens tidak menerima argumen dan mencabut semua sesi tertunda; pengecualian berdasarkan akun tidak lagi didukung.

## Cakupan Kredensial

Operasi akun memerlukan sesi akun yang terverifikasi. Operasi sumber daya bersama memverifikasi kredensial tamu secara eksplisit dan memeriksa kembali izin berbagi saat ini sebelum menerapkan izin sumber daya. Nama akun tidak menentukan jenis kredensial. Akses yang dicabut atau kedaluwarsa ditolak.

## Penyelesaian Pendaftaran

Pendaftaran publik dan penukaran undangan mengembalikan kredensial onboarding selama 30 menit, bukan sesi masuk. Kredensial ini tidak mengizinkan API akun biasa, identitas peramban, pembaruan sesi, atau konfirmasi faktor. Pengguna tetap harus masuk melalui pemeriksaan akhir dan TFA yang berlaku.

Auth memiliki kontrak auth:onboarding versi 1. registerOperation({id, available?, execute}) mengambil cakupan bootstrap pemanggil saat pendaftaran; ID harus dimiliki penyedia tersebut. Pendaftaran ganda ditolak. Penghapusan, kegagalan bootstrap, dan pengaktifan ulang membatalkan pekerjaan yang masih berjalan. listOperations() mencantumkan ID terdaftar termasuk penangan yang sementara tidak tersedia; metadata ini bukan izin. issue(accountId) memeriksa keberadaan akun. Akun dengan validasi tertunda tidak harus sudah aktif.

POST /api/v1/auth/onboarding/operations menerima {operation, input}. Auth memeriksa tujuan, kedaluwarsa, akun, dan masa berlaku penyedia, menjalankan persiapan, lalu memanggil penangan di luar alur yang dapat diperluas. Pemanggilan alur secara langsung tidak dapat menjalankan operasi. Penangan menerima {accountId, assertCurrent} dan wajib menunggu assertCurrent tepat sebelum setiap efek setelah pekerjaan asinkron. Jangan memakai ID akun dari permintaan, hak pemilik biasa, atau identitas tamu. Penyedia memvalidasi masukannya sendiri. Kesalahan yang dikenal dapat melempar tepat {status, code}, dengan status 400, 409, 422, 429, atau 503 dan kode pendek berhuruf kecil serta garis bawah. Kesalahan tak terduga menghasilkan onboarding_operation_failed tanpa rincian internal.

POST /api/v1/auth/onboarding/complete mencabut kredensial saat selesai atau dibatalkan tanpa menukarnya dengan sesi. Login normal yang berhasil dan penghapusan akun belum terverifikasi mencabut kredensial onboarding akun tersebut saja. Permintaan terputus tetap dibatasi kedaluwarsa. Format penyimpanan 2 memvalidasi tujuan onboarding, peran pengguna, penyedia lokal, penyiapan tidak tertunda, dan batas 30 menit secara eksplisit.

Berkas token, basis data penyedia, dan pengiriman bukan satu transaksi. Efek yang telah selesai dapat tetap ada setelah pemeriksaan atau penulisan berikutnya gagal. Pembersihan saat halaman ditutup atau jaringan gagal hanya upaya terbaik, bukan jaminan pengiriman.

Pencabutan langsung berlaku dalam proses ini, tetapi penulisan berkas token yang gagal dapat meninggalkan otoritas lama di disk sampai percobaan ulang berhasil. Penyelesaian bersifat idempoten untuk kredensial onboarding tercabut yang masih disimpan dan mencoba ulang penulisannya. Pembacaan akun, ketersediaan penyedia asinkron, dan efek penyedia tidak atomik lintas penyimpanan. Penerbitan adalah antarmuka server tepercaya, bukan endpoint publik yang menerbitkan kredensial bagi ID akun dari permintaan.

## Kelanjutan Login Tertunda

Setelah penyedia SSO menerima faktor pertama, akun dengan faktor kedua kembali ke `/login` untuk memasukkan kode yang sudah dikirim. Sesi tidak diterbitkan dan profil tidak diaktifkan kembali sebelum verifikasi. Coba Lagi mengambil ulang formulir tertunda setelah kegagalan sementara; Batal membatalkan percobaan dan kembali ke login biasa. Memuat ulang tidak mengirim email lagi.

Auth 2.2.10 menambahkan `GET /api/v1/auth/login-attempt` dan `DELETE /api/v1/auth/login-attempt`. GET mengembalikan `{data: null}` atau tampilan TFA yang ada, termasuk `tfaRequired`, `loginAttemptId`, deskriptor metode dan `loginUrl: "/login"`. DELETE menerima JSON `{loginAttemptId}` dan hanya membatalkan percobaan yang sama persis dengan cookie browser peminta. Rute menjalankan alur milik Auth `auth:loginContinuation` dengan tahap `validateRequest` dan `applyContinuation`. Otorisasi akun dan verifikasi faktor tetap berlaku.

Cookie `cognis_login_attempt` bersifat HttpOnly, memakai SameSite=Lax, dibatasi ke `/api/v1/auth`, dan mengikuti kebijakan cookie Secure yang ada. Cookie merujuk pada percobaan asli milik server yang berlaku lima menit. GET tidak membuat percobaan, memperpanjang masa berlaku, atau mengirim ulang kode. Metadata metode, termasuk panjang kode yang diterbitkan dan waktu kirim ulang, dipertahankan. Kedaluwarsa, konsumsi atomik yang berhasil, pembatalan dan pembersihan Auth menonaktifkan kelanjutan. Logout serta login berikutnya yang berhasil tanpa faktor kedua membatalkan percobaan yang cocok.

Login tertunda baru menggantikan percobaan dalam cookie permintaan. Tab berbagi cookie browser; pembatalan menyertakan ID percobaan yang ditampilkan sehingga tab lama tidak membatalkan percobaan baru. GET dan DELETE tidak pernah menimpa cookie, termasuk setelah kedaluwarsa. Permintaan awal bersamaan tanpa cookie bersama membuat percobaan terpisah; cookie respons yang dipertahankan browser menentukan kelanjutan berikutnya. Tidak ada permintaan yang memberikan sesi kepada akun lain. Pembatalan tidak dapat membatalkan login yang sudah selesai. Percobaan bersifat lokal pada proses dan hilang saat mulai ulang.

Integrasi SSO harus memperlakukan `tfaRequired: true` sebagai autentikasi belum selesai dan hanya mengikuti penanda eksplisit `loginUrl: "/login"` pada respons berhasil. Penanda hanya diterbitkan setelah Auth mengikat percobaan aktif dengan akun dan penyedia yang sesuai. Terapkan Auth 2.2.10 bersama X SSO 1.0.63; modul menolak kelanjutan jika host lama tidak mendukung kontrak ini. Login lokal dan SSO tanpa TFA tetap memakai alur penyelesaian semula. ID percobaan hanya disimpan dalam memori atau badan permintaan, bukan URL atau penyimpanan browser. Integrasi login menerima akar hanya-kueri yang dibatasi pada percobaan dan formulir aktif; pekerjaan terlambat tidak dapat mengubah tampilan yang sudah diganti.

## Pengiriman tantangan berbatas waktu

`auth:getPendingLoginLifetime` versi 1 hanya membaca `{ id, accountId, expiresAt, signal }` dari percobaan yang sudah melewati autentikasi utama. Operasi ini tidak membuat atau memperpanjang kewenangan. Auth membuat percobaan sebelum persiapan faktor otomatis tanpa menerbitkan sesi atau mengaktifkan profil. Tenggat lima menit yang tetap membatasi pengiriman. Konsumsi, pembatalan, kedaluwarsa, penggantian kelanjutan, logout, dan pembersihan pemilik membatalkan sumber daya tantangan. Kelanjutan berbasis cookie, perlindungan percobaan lama, dan melanjutkan tanpa pengiriman ulang tetap berlaku. Keberhasilan faktor membatalkan tantangan tanpa membatalkan komit sesi akhir yang terpisah. TFA menolak jika kontrak ini tidak tersedia.

## Otorisasi Target Akun

Pengelolaan lintas akun serta semua pembacaan TFA dengan pilihan target, operasi kode pemulihan, preferensi metode, pengaktifan/penonaktifan, dan pengaturan ulang administrator memerlukan kebijakan Auth `auth:authorizeAccountTarget` v1. Administrator tidak dapat mengelola administrator lain, pemilik, atau administrator pendiri. Operasi yang diizinkan bagi pemilik tetap tersedia. Kebijakan yang hilang atau metadata akun yang tidak dapat dibaca menyebabkan penolakan sebelum akses penyimpanan lanjutan. Pengelolaan pengguna tetap melarang pengelolaan diri; TFA menerima target pribadi yang tidak ditentukan atau ditentukan secara persis. Penyiapan dan detail metode tetap khusus akun sendiri. Parameter target kosong, ganda, atau tidak valid ditolak. Gunakan Pengaturan untuk keamanan akun sendiri dan administrasi Pengguna untuk akun lain yang memenuhi syarat.

## Label Formulir Kata Sandi

Keamanan memakai kunci XML bersama `ui.reuse.password_requirements` dan `ui.reuse.passwords_match`. Bagian Pengaturan terdaftar memuat katalog Auth dan host tanpa mewajibkan Registration aktif. Kebijakan kata sandi, validasi konfirmasi, dan pembatasan penyedia tetap sama. Terapkan Auth 2.2.13 bersama katalog UI host yang sesuai.
