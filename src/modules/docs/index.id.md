# Kerangka Modul

## Ikhtisar

Kerangka modul Cognis memungkinkan pengembang pihak ketiga dan komunitas untuk memperluas platform dengan mode pembelajaran baru, integrasi, dan halaman UI tanpa mengubah inti sistem. Modul adalah direktori atau arsip mandiri yang mendeklarasikan `manifest.json`, mendaftarkan rute API, menyediakan halaman UI, dan secara opsional menambahkan subperintah CLI. Modul inti (`class: "core"`) disertakan dengan platform dan tidak dapat diaktifkan/dinonaktifkan. Modul ekstensi dapat diaktifkan, dinonaktifkan, diinstal, dan dihapus saat runtime melalui API admin atau `cognisctl`.

## Tanggung Jawab

- Menemukan dan memuat manifes modul dari `COGNIS_MODULES_ROOT` (default `src/modules`).
- Mengekspos operasi `enable` dan `disable` melalui antarmuka `ModuleRuntimeGateway`.
- Memuat setiap modul aktif melalui entrypoint bootstrap (`entrypoints.bootstrap`) dan menyalurkan semua fitur modul melalui ctx.
- Memblokir rute modul agar tidak menimpa prefiks sistem yang dilindungi.
- Memperbarui rute modul yang terdaftar saat modul diaktifkan atau dinonaktifkan.

Tidak bertanggung jawab untuk: menyediakan persistensi data tingkat modul (modul menggunakan kapabilitas `db:executor`) atau merender halaman UI modul (modul menyediakan titik masuk HTML mereka sendiri melalui `entrypoints.ui`).

## Arsitektur

### Penemuan modul

Saat startup, `ModuleService` memindai `COGNIS_MODULES_ROOT` untuk direktori yang berisi `manifest.json`. Setiap manifes yang valid diurai menjadi objek `ModuleManifest`.

**Aktivasi gaya nginx:** Modul yang aktif ditandai dengan file pointer `.load` di `{modulesRoot}/{moduleId}.load`. Membuat file tersebut mengaktifkan modul; menghapusnya menonaktifkan modul. Ini mencerminkan pola symlink `sites-enabled` nginx dan berarti mengaktifkan/menonaktifkan modul adalah operasi sistem file yang bertahan setelah proses dimulai ulang.

### Modul internal vs eksternal

| Tipe       | Sumber                                            | Instalasi                                    | Penafian                       |
| ---------- | ------------------------------------------------- | -------------------------------------------- | ------------------------------ |
| `internal` | Dibundel dalam repositori di bawah `src/modules/` | Pra-instal                                   | Tidak ada                      |
| `external` | Arsip `.zip` atau `.tar.gz` yang diunggah         | Melalui API admin atau CLI `modules:install` | Ditampilkan sebelum diaktifkan |

Modul eksternal diinstal dengan mengunggah arsip terkompresi. Kerangka kerja mengekstrak arsip, memverifikasi `manifest.json`-nya, dan menempatkan direktori modul di bawah `COGNIS_MODULES_ROOT`.

### Kontrak ModuleManifest

```ts
export interface ModuleManifest {
    id: string;
    name: string;
    version: string;
    publisher?: string;
    class: "core" | "extension";
    coreApiVersion: string;
    capabilities: string[];
    requires?: string[];
    entrypoints: {
        bootstrap?: string;
        api?: string;
        ui?: string;
        cli?: string;
        db?: string;
    };
}
```

Modul dengan `class: 'core'` tidak dapat dinonaktifkan melalui API. `requires` mencantumkan ID gateway yang harus aktif agar modul dapat berfungsi; UI admin meminta untuk mengaktifkan dependensi yang dinonaktifkan sebelum modul diaktifkan.

### Kontrak frontend

Modul yang menyediakan `entrypoints.ui` harus mengekspor halaman mereka di jalur yang dideklarasikan relatif terhadap direktori modul. Platform menyuntikkan `<script src="/ui/main.js">` dan `<link rel="stylesheet" href="/ui/styles.css">` standar, dan halaman modul dirender dalam shell bersama.

### Pendaftaran rute API

```ts
export function registerApiRoutes(router) {
    router.get(
        "/api/v1/modules/my-module/data",
        async (req, res) => {
            // handler
        },
        { access: { minRole: "moderator" } },
    );
    router.post(
        "/api/v1/modules/my-module/admin-audit",
        async (req, res) => {
            // handler
        },
        { access: { onlyRole: "owner" } },
    );
}
```

`createModuleExtensionRoutes` di `src/modules/routes/module-extensions.ts` memuat modul aktif melalui `entrypoints.bootstrap` bila tersedia. Bootstrap menerima objek ctx (`moduleId`, `moduleRoot`, `getCapability`, `router`, `registerApiGet`, `registerApiPost`, dan metode registrasi UI) dan menjadi satu-satunya permukaan integrasi yang diizinkan.

Impor langsung lintas modul atau inti-ke-modul dilarang. Pertukaran kapabilitas harus lewat ctx.

Setiap rute modul dapat mendeklarasikan metadata kebijakan akses opsional melalui
argumen router ketiga:

- `access.minRole` — mengizinkan peran target dan semua peran yang lebih tinggi
  (`user < teacher < moderator < admin < owner`)
- `access.onlyRole` — mengizinkan tepat satu grup peran

### Prefiks rute yang dilindungi

Rute modul tidak boleh dimulai dengan prefiks berikut:

| Prefiks          | Alasan                  |
| ---------------- | ----------------------- |
| `/api/v1/system` | Titik akhir sistem inti |
| `/api/v1/auth`   | Gateway autentikasi     |
| `/api/v1/users`  | Manajemen pengguna      |
| `/public`        | Aset statis platform    |
| `/ui`            | Aset UI platform        |

Upaya untuk mendaftarkan rute di bawah prefiks yang dilindungi akan memblokir aktivasi modul.

`routes.json` mendukung string rute biasa maupun objek rute dengan metadata
kebijakan akses untuk halaman UI:

```json
[
    "/api/v1/modules/my-module/data",
    { "path": "/my-module/page", "access": { "minRole": "admin" } },
    { "path": "/my-module/owner-audit", "access": { "onlyRole": "owner" } }
]
```

## Konfigurasi

| Variabel              | Default                               | Deskripsi                                        |
| --------------------- | ------------------------------------- | ------------------------------------------------ |
| `COGNIS_MODULES_ROOT` | `src/modules` (diselesaikan dari cwd) | Direktori yang dipindai untuk subdirektori modul |

## Rute API

| Metode | Jalur                           | Deskripsi                                                       | Auth   |
| ------ | ------------------------------- | --------------------------------------------------------------- | ------ |
| `GET`  | `/api/v1/modules`               | Daftar semua modul yang terinstal beserta status aktif/nonaktif | Bearer |
| `POST` | `/api/v1/modules/:id/enable`    | Aktifkan modul                                                  | Admin  |
| `POST` | `/api/v1/modules/:id/disable`   | Nonaktifkan modul                                               | Admin  |
| `POST` | `/api/v1/modules/install`       | Instal modul dari arsip yang diunggah                           | Admin  |
| `POST` | `/api/v1/modules/import/github` | Impor arsip modul dari tag repositori GitHub                    | Admin  |

## Siklus Impor GitHub

1. Admin mengirim `repositoryUrl` dan `versionTag` lewat UI Administration atau `cognisctl modules:import-github`.
2. Rute API `/api/v1/modules/import/github` memvalidasi input lalu meneruskan ke `ModuleService.importFromGithub`.
3. Service mengunduh arsip tag dari `codeload.github.com` dan meneruskan byte ke module runtime gateway.
4. Runtime memasang arsip sebagai direktori modul drop-in yang mengikuti kontrak file wajib.
5. Admin mengaktifkan modul lewat alur `/enable` normal.

## File Wajib untuk Modul Baru

Setiap modul ekstensi runtime wajib berisi:

- `manifest.json` (identitas, kapabilitas, entrypoint, dependensi)
- `routes.json` (deklarasi rute API/UI untuk pemeriksaan keamanan)
- `bootstrap.js` atau `bootstrap.ts` (gerbang tunggal yang menyuntikkan kapabilitas modul ke ctx)
- direktori `ui/` (aset statis, wajib meski entrypoint UI belum diekspos)

Disarankan jika relevan:

- `api/index.js` atau `api/index.ts`
- `cli/index.js`
- `db/*.sql`
- `docs/standard.<lang>.md`
