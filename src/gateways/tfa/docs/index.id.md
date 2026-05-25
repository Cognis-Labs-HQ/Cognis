# TFA Gateway

## Ikhtisar

Gateway TFA memiliki semua fungsi autentikasi dua faktor di Cognis. Ia menemukan adapter metode di `src/adapters/tfa/`, menyimpan status adapter dan kode pemulihan, menentukan apakah pengguna wajib menyiapkan TFA, lalu memverifikasi faktor kedua saat login.

Gateway auth tidak mengetahui detail TOTP atau metode lain di masa depan. Gateway auth hanya memvalidasi langkah kredensial utama lalu memakai capability yang diekspor gateway TFA.

## Tanggung Jawab

- Menemukan adapter TFA dari `src/adapters/tfa/*`.
- Menyimpan konfigurasi adapter dan status aktif/nonaktif.
- Memulihkan status adapter tanpa mengaktifkan ulang adapter yang dinonaktifkan admin.
- Menyediakan route setup, enable/disable, preferensi, dan kode pemulihan.
- Menegakkan setup wajib saat kebijakan global TFA aktif untuk semua pengguna.
- Memverifikasi challenge login dan mengonsumsi kode pemulihan secara atomik.
- Mendaftarkan UI settings/admin dan aset statis milik TFA.

Bukan tanggung jawab gateway ini: validasi kredensial utama, kebijakan kata sandi, atau pembuatan akun.

## Arsitektur

`src/gateways/tfa/gateway.ts` mendefinisikan `CoreTfaGateway`. Kelas ini menyimpan registry adapter, mendelegasikan setup dan verifikasi khusus metode ke adapter, serta memusatkan kebijakan bersama seperti urutan metode pilihan, kode pemulihan, dan enforcement global.

Bootstrap di `src/gateways/tfa/bootstrap.ts` melakukan urutan berikut:

1. Membuat `DbTfaStore` dan memastikan schema tersedia.
2. Menemukan adapter di `src/adapters/tfa/`.
3. Memuat konfigurasi adapter yang tersimpan.
4. Mendaftarkan route API dan route admin adapter.
5. Mendaftarkan UI settings/admin milik TFA.
6. Menyumbangkan capability TFA untuk auth dan gateway lain.

## Capability

Gateway ini mendaftarkan capability berikut melalui `ctx.capabilities`:

- `tfa:getUserStatus(accountId)`
- `tfa:getLoginMethods(accountId)`
- `tfa:verifyLogin(accountId, methodId, payload)`
- `tfa:isSecondFactorEnabled(accountId)`
- `tfa:isSetupRequired(accountId)`
- `tfa:resetUser(accountId)`
- `tfa:getEnforceAllUsers()`
- `tfa:setEnforceAllUsers(required)`

Capability ini adalah permukaan integrasi yang didukung. Komponen lain tidak boleh mengimpor internal adapter TFA secara langsung.

## Route API

| Metode | Path                                   | Deskripsi                                  | Auth   |
| ------ | -------------------------------------- | ------------------------------------------ | ------ |
| `GET`  | `/api/v1/tfa/status`                   | Membaca status setup pengguna saat ini     | Bearer |
| `GET`  | `/api/v1/tfa/methods`                  | Membaca metode dan metadata kode pemulihan | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/begin`  | Memulai setup metode                       | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/verify` | Memverifikasi setup                        | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/setup/cancel` | Membatalkan setup                          | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/enable`       | Mengaktifkan kembali metode tersimpan      | Bearer |
| `POST` | `/api/v1/tfa/methods/:id/disable`      | Menonaktifkan metode                       | Bearer |
| `PUT`  | `/api/v1/tfa/methods/preferences`      | Menyimpan urutan metode pilihan            | Bearer |
| `GET`  | `/api/v1/tfa/recovery-codes`           | Membaca status kode pemulihan              | Bearer |
| `POST` | `/api/v1/tfa/recovery-codes/rotate`    | Mengganti kode pemulihan                   | Bearer |
| `POST` | `/api/v1/tfa/admin/users/:id/reset`    | Mereset status TFA pengguna                | Admin  |
| `GET`  | `/api/v1/gateways/tfa/adapters`        | Menampilkan adapter terdaftar              | Admin  |

## Kepemilikan UI

Aset browser milik TFA berada di `src/gateways/tfa/ui/`. Gateway ini mendaftarkan section settings, section administration, dan direktori aset statisnya sendiri. String khusus TOTP tetap berada di adapter TOTP di `src/adapters/tfa/totp/languages/`.

## Kontrak Adapter

Setiap adapter di `src/adapters/tfa/<adapter-id>/` mengimplementasikan setup dan verifikasi khusus metode. Alur bersama seperti kode pemulihan, urutan preferensi, dan enforcement global tetap berada di gateway agar metode baru dapat ditambahkan tanpa menduplikasi kebijakan.
