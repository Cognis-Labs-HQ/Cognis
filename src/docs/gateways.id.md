# Pengembangan Gateway dan Adapter

## Ikhtisar

Gateway adalah satu-satunya otoritas untuk domain terbatas di Cognis. Gateway
memiliki skema, rute, kapabilitas, dan adapter untuk domain tersebut. Sisa
platform tidak pernah mengimpor dari kode gateway secara langsung — melainkan
mengonsumsi kapabilitas dari `CapabilityStore` bersama atau memanggil antarmuka
publik gateway.

Adapter adalah implementasi konkret yang berada di bawah gateway. Adapter
ditemukan dan di-bootstrap oleh gateway yang memilikinya saat server dimulai.
Core maupun server tidak mengetahui adapter mana yang ada.

## Tanggung Jawab

### Gateway

- Memiliki `manifest.json` yang mendeklarasikan identitas dan dependensinya.
- Mengekspor fungsi `bootstrap(ctx)` yang dipanggil server saat startup.
- Mendaftarkan diri ke `GatewayRegistry` selama bootstrap.
- Mendaftarkan rute HTTP melalui `ctx.routeRegistry`.
- Menyumbangkan kapabilitas ke `ctx.capabilities`.
- Menemukan dan me-bootstrap adapter sendiri dari `src/adapters/<gateway-id>/`.

### Adapter

- Mengekspor fungsi `bootstrap<Domain>Adapter(ctx)`.
- Mengimplementasikan logika domain, penyiapan skema, dan pendaftaran rute.
- Mendaftarkan diri ke gateway dengan memanggil `ctx.gateway.registerSender(...)`
  atau `ctx.gateway.registerAdapter(...)`.
- Tidak pernah mendaftar langsung ke `GatewayRegistry`.

## Arsitektur

### Struktur direktori

```
src/gateways/<id>/
  manifest.json
  bootstrap.ts
  gateway.ts
  docs/
    index.en.md
    index.de.md
    index.ja.md
    index.id.md

src/adapters/<id>/<adapter-id>/
  package.json
  index.ts
  docs/
    index.en.md
    ...
  tests/
```

### manifest.json

```json
{
    "id": "notify",
    "name": "Notification Gateway",
    "version": "1.3.0",
    "description": "Pluggable notification dispatch.",
    "publisher": "Cognis Labs",
    "required": false,
    "requires": ["db"],
    "hasAdapters": true
}
```

| Field         | Wajib | Deskripsi                                                          |
| ------------- | ----- | ------------------------------------------------------------------ |
| `id`          | Ya    | Pengenal unik; sesuai dengan nama direktori                        |
| `name`        | Ya    | Nama tampilan yang dapat dibaca manusia                            |
| `version`     | Ya    | Versi semantik; tingkatkan pada setiap perubahan kode atau skema   |
| `description` | Tidak | Satu kalimat yang ditampilkan di UI admin                          |
| `required`    | Tidak | Jika `true`, server menolak start jika bootstrap gagal             |
| `requires`    | Tidak | ID gateway yang harus ada sebelum gateway ini diinisialisasi       |
| `hasAdapters` | Tidak | Jika `true`, UI admin menampilkan bagian adapter untuk gateway ini |

### bootstrap.ts

```ts
import type { GatewayBootstrapContext } from "../shared.js";

export async function bootstrap(ctx: GatewayBootstrapContext): Promise<void> {
    // 1. Baca kapabilitas dari gateway sebelumnya
    // 2. Buat instans kelas gateway
    // 3. Bootstrap adapter
    // 4. Daftarkan rute
    // 5. Sumbangkan kapabilitas
    // 6. Daftar ke registry gateway
    // 7. Daftarkan bagian UI
}
```

| Field             | Tipe              | Deskripsi                                                         |
| ----------------- | ----------------- | ----------------------------------------------------------------- |
| `gatewayRegistry` | `GatewayRegistry` | Panggil `.register(manifest)` agar gateway terlihat               |
| `capabilities`    | `CapabilityStore` | `.get<T>(key)` untuk membaca; `.contribute(key, v)` untuk menulis |
| `routeRegistry`   | `RouteRegistry`   | `.register(handler, gatewayId?)` untuk menambah rute HTTP         |
| `uiRegistry`      | `UIRegistry`      | Daftarkan bagian admin dan direktori statis                       |
| `adaptersRoot`    | `string`          | Path absolut ke `src/adapters/`                                   |
| `log`             | `BootstrapLog?`   | Logger terstruktur; tersedia setelah logging gateway              |

### Penemuan adapter

```ts
try {
    await bootstrapFn(adapterCtx);
} catch (err) {
    ctx.log?.("error", `Adapter "${entry}" gagal di-bootstrap — dilewati.`, {
        component: "foo-gateway",
        adapter: entry,
        error: err instanceof Error ? err.message : String(err),
    });
}
```

Setiap pemanggilan adapter harus dibungkus dalam `try/catch` sendiri. Jika error
merambat, `GatewayService` akan menangkapnya secara diam-diam dan gateway tidak
pernah terdaftar.

### Menulis adapter

```ts
export async function bootstrapNotifyAdapter(
    ctx: NotifyAdapterBootstrapCtx,
): Promise<void> {
    const smtpHost = process.env.COGNIS_SMTP_HOST;
    if (!smtpHost) {
        ctx.log?.(
            "warn",
            "Adapter SMTP: COGNIS_SMTP_HOST tidak diset — dilewati.",
        );
        return;
    }

    const sender = createSmtpSender(smtpHost, ctx.log);
    ctx.gateway.registerSender(sender);
}
```

- Jika dependensi tidak tersedia, log peringatan dan `return` lebih awal, jangan lempar error.
- Daftarkan diri hanya di akhir, setelah semua setup berhasil.
- Impor tipe konteks dari `gateway.ts`, bukan dari `bootstrap.ts`.

### Urutan boot

1. `files` — menyumbangkan kapabilitas file I/O
2. `logging` — menyumbangkan `logging:log`
3. `db` — menyumbangkan `db:executor` dan `db:type`
4. Semua gateway lainnya — diurutkan alfabetis

## Titik Ekstensi

Untuk menambah adapter baru:

1. Buat `src/adapters/<gateway-id>/<adapter-id>/`.
2. Tambahkan `package.json` dengan `name`, `version`, dan `main`.
3. Ekspor `bootstrapFooAdapter(ctx)`.
4. Tambahkan `docs/index.en.md` dan varian bahasa.
5. Tambahkan pengujian di `tests/`.

Untuk menambah gateway baru:

1. Buat `src/gateways/<id>/` dengan `manifest.json`, `bootstrap.ts`, dan `gateway.ts`.
2. Tambahkan `docs/index.en.md` dan varian bahasa.
3. Tambahkan entri di `src/docs/index.<lang>.md` pada tabel Gateway.
