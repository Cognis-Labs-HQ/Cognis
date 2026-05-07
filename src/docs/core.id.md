# Inti

## Ikhtisar

`src/core/` adalah lapisan fondasi Cognis. Berisi kontrak, antarmuka, dan layanan kebijakan yang tidak bergantung pada penyedia yang menjadi landasan sisa platform. Core mendefinisikan kemampuan apa yang ada dan aturan apa yang mengaturnya — core tidak pernah berisi implementasi konkret dari kemampuan tersebut.

Aturan kritis adalah bahwa core tidak pernah mengimpor dari kode gateway atau adapter. Panah ketergantungan selalu mengarah ke dalam: gateway mengimpor dari core; core tidak tahu bahwa gateway ada. Invarian ini menjaga core tetap stabil dan dapat diuji secara terisolasi, dan memastikan bahwa mengganti gateway atau adapter tidak dapat merusak lapisan kontrak.

Core saat ini mengekspos dua layanan dan empat namespace kemampuan. Ini sengaja diminimalkan — filosofi desainnya adalah bahwa logika domain berada di gateway, bukan core. Core berkonsentrasi pada siklus hidup (modul), pelaporan kesehatan, dan mendefinisikan antarmuka bersama yang diimplementasikan gateway.

## Tanggung Jawab

- Mendefinisikan antarmuka `DatabaseGateway`, `FileStorageGateway`, `AuthAccountStore`, `AuthContext`, dan antarmuka lintas komponen lainnya yang dikonsumsi oleh gateway.
- Menyediakan `ModuleService` untuk manajemen siklus hidup modul (penemuan, aktifkan, nonaktifkan, penulisan pointer, penegakan keamanan rute).
- Menyediakan `HealthService` untuk kesehatan platform dan metadata uptime.
- Mendefinisikan kontrak `ModuleManifest` yang harus dipenuhi semua modul.
- Mengekspos namespace kemampuan `system:health`, `auth:accounts`, `modules:lifecycle`, dan `ui:shell`.

Tidak bertanggung jawab atas: mengimplementasikan autentikasi, menyimpan data, mengirim notifikasi, atau operasi apapun yang menyentuh SDK penyedia.

## Arsitektur

### Lokasi sumber utama

| Jalur | Tujuan |
| ----- | ------ |
| `src/core/contracts/auth-account.ts` | Antarmuka `AuthAccount`, `ExternalIdentity`, `AuthAccountStore` |
| `src/core/contracts/module-manifest.ts` | Antarmuka `ModuleManifest` |
| `src/core/services/module-service.ts` | Kelas `ModuleService` |
| `src/core/services/health-service.ts` | Kelas `HealthService` |
| `src/core/services/gateway-service.ts` | Layanan registri gateway |
| `src/core/index.ts` | Ekspor publik untuk paket `@cognis/core` |

### ModuleService

`ModuleService` di `src/core/services/module-service.ts` mengatur siklus hidup modul penuh. Beroperasi pada abstraksi `ModuleRuntimeGateway` dan `ModulePathResolver` opsional. Ketika resolver jalur ada, operasi aktifkan/nonaktifkan menulis dan menghapus file pointer (symlink nginx-style `<id>.load`) yang menunjuk ke direktori internal tepercaya atau direktori ekstraksi runtime untuk arsip eksternal.

Sebelum mengaktifkan modul apapun, `ModuleService` memberlakukan dua pengaman:

- Modul inti (`class: "core"` dalam manifes) tidak dapat diubah pada saat runtime.
- Modul eksternal memerlukan pengakuan penafian eksplisit sebelum pointer ditulis.

Keamanan rute diberlakukan sebelum modul diaktifkan: jika `routes.json` modul mendeklarasikan jalur di bawah awalan yang dilindungi (`/api/v1/system`, `/api/v1/auth`, `/api/v1/users`, `/public`, `/ui`), pengaktifan ditolak.

```ts
// src/core/services/module-service.ts
export class ModuleService {
  async enable(moduleId: string, options?: { acknowledgeExternalDisclaimer?: boolean }): Promise<{ moduleId: string; enabled: boolean }>;
  async disable(moduleId: string): Promise<{ moduleId: string; enabled: boolean }>;
  async list(): Promise<ModuleManifest[]>;
}
```

### HealthService

`HealthService` di `src/core/services/health-service.ts` mencatat waktu mulai server dan mengembalikan objek `HealthStatus` sesuai permintaan. Ini tanpa status di luar cap waktu mulai.

```ts
export interface HealthStatus {
  status: 'ok';
  timestamp: string;
  startedAt: string;
  uptimeMs: number;
}
```

### Antarmuka AuthAccountStore

`AuthAccountStore` di `src/core/contracts/auth-account.ts` adalah antarmuka yang harus diimplementasikan adapter auth untuk persistensi akun. Ini mencakup menemukan akun berdasarkan identitas eksternal, membuat akun eksternal, dan membuat akun lokal.

```ts
export interface AuthAccountStore {
  findByExternalIdentity(provider: string, externalUserId: string): Promise<AuthAccount | null>;
  createExternalAccount(identity: ExternalIdentity): Promise<AuthAccount>;
  updateExternalAccount(accountId: string, identity: ExternalIdentity): Promise<AuthAccount>;
  createLocalAccount(input: { username: string; passwordHash: string; email?: string; isAdmin?: boolean }): Promise<AuthAccount>;
}
```

### Namespace kemampuan

| Kemampuan | Pemilik | Deskripsi |
| --------- | ------- | --------- |
| `system:health` | Core / rute sistem | Mengekspos kesehatan platform dan uptime via `GET /api/v1/system/health` |
| `auth:accounts` | Gateway auth | Siklus hidup akun bawaan dan pengkabelan kebijakan autentikasi |
| `modules:lifecycle` | Rute modul | Daftar modul, kontrol aktifkan/nonaktifkan, dan pemeriksaan kebijakan |
| `ui:shell` | Rute UI | Perutean shell aplikasi bersama dan permukaan operasi admin |
