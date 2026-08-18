# Gateway Autentikasi

## Ikhtisar

Gateway Autentikasi adalah titik masuk tunggal untuk semua operasi login dan identitas di Cognis. Gateway ini memisahkan platform dari penyedia autentikasi tertentu dengan menempatkan dirinya di antara route handler dan adapter autentikasi konkret. Mengganti penyedia autentikasi — dari kata sandi lokal ke LDAP atau SAML — hanya membutuhkan pengaktifan adapter baru melalui API admin; tidak ada route handler atau layanan inti yang perlu diubah.

Gateway menemukan adapter dengan memindai `src/adapters/auth/` saat bootstrap. Setiap direktori adapter harus mengekspor fungsi `createAdapter()`. Adapter lokal selalu dimuat pertama dan diperlakukan secara khusus karena mendukung perintah CLI `user:*` dan alur pembuatan akun admin awal. Semua adapter lainnya dimuat dari direktori mereka dan dapat diaktifkan atau dinonaktifkan saat runtime oleh admin tanpa me-restart server.

## Tanggung Jawab

- Menemukan dan mendaftarkan semua adapter autentikasi dari `src/adapters/auth/` saat bootstrap.
- Mengelola status aktif/nonaktif adapter yang dipersistensikan di `auth_adapter_configs`.
- Memverifikasi kredensial dengan mendelegasikan ke adapter yang diaktifkan untuk penyedia yang diminta.
- Menerbitkan token akses setelah autentikasi berhasil melalui `issueAccessToken`.
- Menyediakan kumpulan kapabilitas terdokumentasi: `auth:accountStore`, `auth:createLocalAdmin`, `auth:getLoginMethods`, `auth:registerPageScriptOrigins`, `auth:issueAccessToken`, `auth:getAuthClaims`, `auth:requireAuth`, `auth:requireRoleAccess`, `auth:revokeAccessTokensForSubject`, `auth:revokeSetupPendingAccessTokens`, dan `auth:routeContext`.
- Mendaftarkan semua route API autentikasi dan route admin adapter.

Tidak bertanggung jawab atas: menyimpan data profil pengguna (itu tugas gateway profil), manajemen sesi di luar penerbitan token, atau logika bisnis non-autentikasi.

## Arsitektur

Kelas utama adalah `CoreAuthGateway` di `src/gateways/auth/gateway.ts`. Kelas ini menyimpan peta adapter terdaftar, kumpulan ID adapter yang diaktifkan, dan referensi ke adapter lokal (yang disambungkan secara terpisah melalui `setLocalAdapter()`).

```ts
export class CoreAuthGateway {
  registerAdapter(adapter: AuthProviderAdapter, requires?: string[]): void;
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

Bootstrap di `src/gateways/auth/bootstrap.ts` dan `src/gateways/auth/bootstrap/`:

1. Menginstansiasi `DbLocalAccountStore` dari `src/adapters/auth/local/store.ts`.
2. Menginstansiasi `CoreAuthGateway` dengan DB executor dan tipe.
3. Memuat adapter lokal melalui `setLocalAdapter()`.
4. Memanggil `discoverAdapters(authAdaptersRoot)` untuk memuat semua adapter lainnya.
5. Memanggil `loadPersistedConfigs()` untuk memulihkan status aktif/nonaktif dari database.
6. Menjalankan hook capability/bootstrap dari `src/gateways/auth/bootstrap/`.
7. Mendaftarkan route dan capability.

Capability yang disediakan:

| Capability                       | Tipe                                           | Keterangan                                                                        |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| `auth:accountStore`              | `LocalAccountStore`                            | Store akun lokal yang digunakan oleh adapter lokal                                |
| `auth:createLocalAdmin`          | `(username, password) => Promise<AuthContext>` | Membuat akun admin jika belum ada                                                 |
| `auth:getLoginMethods`           | `() => Promise<AdapterInfo[]>`                 | Mengembalikan metadata untuk semua penyedia yang diaktifkan                       |
| `auth:registerPageScriptOrigins` | `(ownerId, origins) => string[]`               | Mengganti origin skrip http(s) tepercaya untuk satu pemilik di header CSP halaman |

## Route API

| Metode | Path                                         | Keterangan                                  | Autentikasi      |
| ------ | -------------------------------------------- | ------------------------------------------- | ---------------- |
| `GET`  | `/api/v1/auth/login-methods`                 | Daftar penyedia autentikasi yang diaktifkan | Tidak diperlukan |
| `POST` | `/api/v1/auth/register`                      | Mendaftar akun lokal baru secara mandiri    | Tidak diperlukan |
| `POST` | `/api/v1/auth/login`                         | Autentikasi; mengembalikan token Bearer     | Tidak diperlukan |
| `POST` | `/api/v1/auth/verify`                        | Verifikasi kata sandi pengguna saat ini     | Pengguna         |
| `GET`  | `/api/v1/gateways/auth/adapters`             | Daftar semua adapter autentikasi terdaftar  | Admin            |
| `GET`  | `/api/v1/gateways/auth/adapters/:id/config`  | Mendapatkan skema konfigurasi untuk adapter | Admin            |
| `PUT`  | `/api/v1/gateways/auth/adapters/:id/config`  | Memperbarui konfigurasi untuk adapter       | Admin            |
| `POST` | `/api/v1/gateways/auth/adapters/:id/enable`  | Mengaktifkan adapter                        | Admin            |
| `POST` | `/api/v1/gateways/auth/adapters/:id/disable` | Menonaktifkan adapter                       | Admin            |

## Bootstrap keyring peramban

Gateway Autentikasi memuat adapter keyring wajib sebelum mendaftarkan hook alur sesi peramban. Karena itu, setiap pemuatan halaman langsung dan penyegaran dapat memulihkan kunci sesi tab saat ini yang tidak dapat diekstrak secara otomatis. Jika pemulihan tidak tersedia, penyelesai konten terlindungi pertama membuka dialog buka kunci keyring kontekstual.

## Penerusan kegagalan berbagi

Hasil sesi peramban mempertahankan alasan kegagalan autentikasi alternatif yang netral agar halaman sumber daya publik dapat membedakan sumber daya yang hilang dari status tidak tersedia lainnya tanpa mengimpor internal Autentikasi.
