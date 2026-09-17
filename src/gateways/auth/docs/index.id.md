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

Penyedia dapat mendeklarasikan `routeNamespace` dan `registerRoutes(router)` pada adapternya. Router menerima jalur `GET` dan `POST` relatif terhadap `/api/v1/auth/<routeNamespace>` agar callback OAuth dapat berada di bawah gateway Autentikasi tanpa memberi modul kontributor akses langsung ke rute inti yang dilindungi. Namespace dibatasi pada segmen URL yang aman, namespace inti Autentikasi dicadangkan, rute duplikat ditolak, dan penghapusan penyedia menghapus semua rute kontribusinya.

Sesi penyedia eksternal melewati `gateAccountCreation` sebelum `ensureExternalAccount`. Saat pendaftaran publik dinonaktifkan, sesi harus membawa token pendaftaran dan email penyedia yang cocok. Sesi yang ditahan mengembalikan `account_creation_required` dengan `emailRequired`, `registrationTokenRequired`, dan `retryEndpoint`. UI penyedia mengirim token dan email yang diminta ke endpoint tersebut dengan ID penyedia yang sama; Cognis meneruskan nilai itu ke gerbang pembuatan akun walaupun adapter penyedia hanya mengembalikan identitas terautentikasinya. Membatalkan alih-alih mencoba kembali menghentikan login tanpa membuat akun.

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

Modul SSO dapat mendaftarkan `auth:registerExternalProfileProvider` melalui CTX. Resolver menerima ID penyedia, ID akun Cognis, ID pengguna eksternal, dan sesi penyedia terautentikasi, lalu dapat mengembalikan nama tampilan, bio, lokasi, situs web, serta data avatar dan banner. Adapter Profil menyimpan data tersebut melalui kemampuan penyimpanan miliknya saat akun eksternal pertama kali dibuat.
