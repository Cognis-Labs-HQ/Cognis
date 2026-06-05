# Gateway Notifikasi

## Ikhtisar

Gateway Notifikasi mengirimkan notifikasi melalui adapter pengirim yang dapat dipasang. Gateway ini bertindak sebagai perantara antara bagian lain aplikasi dan mekanisme pengiriman konkret — SMTP, webhook di masa depan, atau sink dalam aplikasi — tanpa perlu mengetahui transport mana yang dikonfigurasi.

Gateway ini juga memiliki dua layanan khusus: `TfaCodeService` untuk menerbitkan dan memvalidasi kode autentikasi dua faktor, dan `VerifyTokenService` untuk alur verifikasi email. Adapter pengirim ditemukan dengan memindai `src/adapters/notify/` saat bootstrap. Adapter SMTP adalah satu-satunya pengirim bawaan; ia aktif secara otomatis ketika `COGNIS_SMTP_HOST` diatur.

## Tanggung Jawab

- Menemukan dan mendaftarkan adapter pengirim notifikasi dari `src/adapters/notify/` saat bootstrap.
- Mengirimkan amplop notifikasi ke semua pengirim yang diaktifkan untuk penerima dan kategori.
- Mempersistensikan dan memuat ulang konfigurasi pengirim dari database.
- Mendaftarkan kategori notifikasi `system`.
- Menyambungkan route penerbitan dan verifikasi kode TFA.
- Menyambungkan route token verifikasi email.

## Arsitektur

Kelas utama adalah `CoreNotificationGateway` di `src/gateways/notify/gateway.ts`.

```ts
export interface NotificationGateway {
    registerSender(sender: NotificationSender): void;
    dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
    registerCategory(id: string, label: string): void;
    listSenders(): NotificationSenderInfo[];
    listCategories(): NotificationCategory[];
}
```

| Path                                          | Tujuan                               |
| --------------------------------------------- | ------------------------------------ |
| `src/gateways/notify/gateway.ts`              | `CoreNotificationGateway`, antarmuka |
| `src/gateways/notify/bootstrap.ts`            | Titik masuk bootstrap                |
| `src/gateways/notify/routes/notifications.ts` | Route pengiriman dan pengelolaan     |
| `src/api/reuse/tfa-code.ts`                   | `TfaCodeService`                     |
| `src/api/reuse/verify-token.ts`               | `VerifyTokenService`                 |

## Route API

| Metode | Path                                        | Keterangan                             | Autentikasi |
| ------ | ------------------------------------------- | -------------------------------------- | ----------- |
| `POST` | `/api/v1/notify/send`                       | Kirim notifikasi                       | Admin       |
| `GET`  | `/api/v1/notify/providers`                  | Daftar pengirim terdaftar              | Pengguna    |
| `GET`  | `/api/v1/notify/categories`                 | Daftar kategori notifikasi             | Bearer      |
| `GET`  | `/api/v1/notify/preferences`                | Dapatkan preferensi notifikasi sendiri | Bearer      |
| `PUT`  | `/api/v1/notify/preferences`                | Perbarui preferensi notifikasi sendiri | Bearer      |
| `POST` | `/api/v1/notify/providers/:senderId/config` | Perbarui konfigurasi pengirim          | Admin       |
| `POST` | `/api/v1/notify/providers/:senderId/test`   | Kirim notifikasi uji coba              | Admin       |
| `POST` | `/api/v1/users/tfa/request`                 | Minta kode TFA                         | Bearer      |
| `POST` | `/api/v1/users/tfa/verify`                  | Verifikasi kode TFA                    | Bearer      |
| `POST` | `/api/v1/users/email/verify/request`        | Minta verifikasi email                 | Bearer      |
| `POST` | `/api/v1/users/email/verify`                | Selesaikan verifikasi email            | Bearer      |
| `GET`  | `/api/v1/users/:username/email`             | Dapatkan email utama pengguna          | Bearer      |
| `PUT`  | `/api/v1/users/:username/email`             | Atur email utama pengguna              | Bearer      |
