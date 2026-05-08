# Gateway Logging

## Ikhtisar

Gateway Logging menyediakan pencatatan log aplikasi terstruktur ke stdout/stderr dan secara opsional ke file log persisten. Gateway ini membuat instance `Logger` dari variabel environment dan berkontribusi ke capability store, sehingga komponen mana pun yang perlu mencatat log dapat melakukannya melalui antarmuka seragam tanpa mengimpor library logger secara langsung.

Gateway logging harus di-bootstrap setelah gateway penyimpanan file. Ketergantungan ini dideklarasikan di `manifest.json` melalui `requires: ["files"]`.

## Tanggung Jawab

- Membuat instance `Logger` yang dikonfigurasi dari `LOG_LEVEL`, `LOG_FILE`, dan `LOG_FORMAT`.
- Berkontribusi `logging:logger` dan `logging:log` ke capability store.
- Merutekan penulisan file log melalui `file:append` jika tersedia.

## Arsitektur

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

Secara default logger menulis keluaran konsol yang mudah dibaca, sementara file log persisten tetap menyimpan baris JSON.

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

Peristiwa pada gateway DB juga memakai logger bersama, tetapi hanya mencatat metadata database yang diringkas (`provider`, jenis pernyataan SQL, jumlah parameter, nama/kode error). Pesan mentah dari mesin database sengaja tidak diteruskan apa adanya karena kontainer database sudah mencatatnya sendiri.

| Variabel     | Default             | Keterangan                                                               |
| ------------ | ------------------- | ------------------------------------------------------------------------ |
| `LOG_LEVEL`  | `info`              | Level log minimum: `debug`, `info`, `warn`, atau `error`                 |
| `LOG_FILE`   | `/app/logs/app.log` | Path absolut untuk file log persisten                                    |
| `LOG_FORMAT` | `pretty`            | Format keluaran konsol: `pretty` untuk log yang mudah dibaca atau `json` |
