# Referensi Teknis

Antarmuka publik dan aturan operasional Log Aplikasi.

## Antarmuka

`logging:recentEntries` mengembalikan salinan maksimal 30 catatan diagnostik yang telah dibersihkan, dengan `timestamp`, `level`, dan `message`. Laporan galat menggunakan kapabilitas publik ini alih-alih membungkus metode konsol dalam Core. Riwayat lokal juga mencakup diagnostik anonim; pengiriman server dan keluaran peramban tetap mengikuti kebijakan gateway yang terpisah.

### Arsitektur

```ts
export class Logger {
    constructor(
        level: LogLevel,
        filePath: string,
        fileAppend?: FileAppend,
        consoleFormat?: ConsoleLogFormat,
    );
    async log(
        level: LogLevel,
        message: string,
        meta?: Record<string, unknown>,
    ): Promise<void>;
    debug(message: string, meta?: Record<string, unknown>): Promise<void>;
    info(message: string, meta?: Record<string, unknown>): Promise<void>;
    warn(message: string, meta?: Record<string, unknown>): Promise<void>;
    error(message: string, meta?: Record<string, unknown>): Promise<void>;
}
```

Secara default logger menulis keluaran konsol dan file log persisten tetap menyimpan baris JSON. `LOG_LEVEL` memfilter stdout/stderr dan `LOG_FILE_LEVEL` secara independen memfilter penulisan file persisten. Administrator dapat mengganti konfigurasi kedua adapter saat berjalan dan meresetnya ke nilai lingkungan. Penggantian disimpan dalam basis data dan dipulihkan saat gateway dimulai, sehingga tetap berlaku setelah kontainer dimulai ulang.

Setiap baris log persisten adalah objek JSON:

```json
{
    "ts": "2024-01-15T10:00:00.000Z",
    "level": "info",
    "message": "Gateway di-bootstrap.",
    "gateway": "auth"
}
```

| Capability       | Tipe                              | Keterangan                                                                  |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------- |
| `logging:logger` | `Logger`                          | Instance Logger lengkap                                                     |
| `logging:log`    | `(level, message, meta?) => void` | Fungsi log sederhana; digunakan sebagai `ctx.log` oleh bootstrapper gateway |

## Konfigurasi

### Konfigurasi

Peristiwa pada gateway DB juga memakai logger bersama, tetapi hanya mencatat metadata database yang diringkas (`provider`, jenis pernyataan SQL, jumlah parameter, nama/kode error). Pesan mentah dari mesin database sengaja tidak diteruskan apa adanya karena kontainer database sudah mencatatnya sendiri.

| Variabel               | Default             | Keterangan                                                                      |
| ---------------------- | ------------------- | ------------------------------------------------------------------------------- |
| `LOG_LEVEL`            | `info`              | Filter verbositas stream log runtime: `debug`, `info`, `warn`, `error`          |
| `LOG_FILE_LEVEL`       | `debug`             | Filter verbositas file persisten: `debug`, `info`, `warn`, `error`              |
| `LOG_FILE`             | `/app/logs/app.log` | Path absolut untuk file log persisten                                           |
| `LOG_FORMAT`           | `pretty`            | Format keluaran konsol: `pretty` untuk log yang mudah dibaca atau `json`        |
| `LOG_ROTATE_MAX_BYTES` | `10485760`          | Rotasi file log aktif saat ukuran mencapai batas ini (byte)                     |
| `LOG_ROTATE_MAX_FILES` | `10`                | Jumlah arsip log hasil rotasi yang disimpan (`0` berarti tidak menyimpan arsip) |
| `LOG_ROTATE_COMPRESS`  | `true`              | Jika `true`, log hasil rotasi dikompresi gzip (`.gz`)                           |

## Perilaku

### Diagnostik Terpusat

Penyedia peramban publik menyediakan `logging:browser` dan mengelola alur `logging:emit` (`validate`, `deliver`, `publish`). Core menerbitkan diagnostik melalui `ui:log` dan menampung maksimal 128 peristiwa sebelum penyedia berlangganan. Selama aktif, gateway juga menangkap panggilan konsol; komponen tidak dapat memaksa keluaran peramban melalui pemilihan metode konsol. Metadata dibatasi; kredensial dan pesan galat mentah dihapus.

Service worker meneruskan peristiwa terstruktur `COGNIS_LOG` ke satu jendela yang dikendalikan dan menampung maksimal 64 peristiwa jika tidak ada jendela tersedia. Penyedia hanya menerima pesan dari pengendali service worker saat ini dan melepas pendengar, penangkapan konsol, serta langganannya ketika dihentikan.

`POST /api/v1/logging/entries` tetap memerlukan autentikasi. Respons 204 menyertakan `x-cognis-log-console: true` hanya bagi administrator ketika peristiwa memenuhi ambang adaptor konsol saat ini. Peramban hanya menampilkan keluaran setelah izin tersebut; pengiriman yang ditolak atau gagal tidak mencetak atau melaporkan dirinya secara rekursif. Peristiwa anonim mencapai penyedia gateway, tetapi tidak dikirim ke endpoint terautentikasi atau ditampilkan. Filter konsol server dan berkas tetap terpisah.

### Ikhtisar

Gateway Logging menyediakan pencatatan log aplikasi terstruktur ke stdout/stderr dan secara opsional ke file log persisten. Gateway ini membuat instance `Logger` dari variabel environment dan berkontribusi ke capability store, sehingga komponen mana pun yang perlu mencatat log dapat melakukannya melalui antarmuka seragam tanpa mengimpor library logger secara langsung.

Gateway logging harus di-bootstrap setelah gateway penyimpanan file. Ketergantungan ini dideklarasikan di `manifest.json` melalui `requires: ["files"]`.

### Tanggung Jawab

- Membuat instance `Logger` yang dikonfigurasi dari `LOG_LEVEL`, `LOG_FILE`, `LOG_FORMAT`, dan variabel rotasi log.
- Berkontribusi `logging:logger` dan `logging:log` ke capability store.
- Merutekan penulisan file log melalui `file:append` jika tersedia.
- Menyediakan `GET /api/v1/logging/stream` untuk halaman Administrasi → Log (aliran SSE khusus admin dengan filter tingkat keparahan dan kata kunci).

### Penerimaan log browser

Komponen browser terautentikasi mengirim entri terstruktur dengan `POST /api/v1/logging/entries` memakai `{ level, message, meta }`. Gateway memvalidasi tingkat dan pesan, menambahkan akun terautentikasi serta sumber browser, lalu menulis entri melalui `logging:log`.

### Kolom Adaptor Terlokalisasi

Definisi adaptor Logging memakai `labelKey`. Gateway menyajikan skema katalog dan konfigurasi dengan kunci terjemahan browser `label` serta `stringsBaseUrl` milik setiap adaptor. Tipe, opsi, dan nilai mempertahankan makna yang ditentukan penyedia. Pembacaan konfigurasi tetap hanya untuk administrator.

## Keamanan

Pemeriksaan dan konfigurasi log memerlukan administrasi. Perlakukan log sebagai data sensitif; jangan catat kredensial, token, atau isi pesan pribadi.

## Referensi

### Spesifikasi Teknis

| Halaman / bagian            | Panduan         | Akses         |
| --------------------------- | --------------- | ------------- |
| `/administration` · `#logs` | Pemeriksaan Log | Administrator |

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/adapters/social/messages/technical).
