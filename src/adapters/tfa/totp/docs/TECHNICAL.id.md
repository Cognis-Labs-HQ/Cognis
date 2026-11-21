# Referensi Teknis

Antarmuka publik dan aturan operasional Verifikasi Autentikator.

## Antarmuka

Verifikasi Autentikator terintegrasi melalui gerbang pemilik; manifesnya mengidentifikasi komponen dan dependensi yang diperlukan.

## Konfigurasi

### Konfigurasi

Adaptor menyediakan satu pengaturan admin:

- `algorithm` — algoritma HMAC untuk verifikasi penyiapan dan verifikasi login.

Metode mendeklarasikan placeholder masuk, basis bahasa, dan label konfigurasi; gateway menampilkannya tanpa percabangan ID penyedia.

## Perilaku

### Adaptor TOTP

Adapter ini mengelola penggantian `COGNIS_TOTP_ISSUER`. Kode tidak valid memakai kesalahan bersama `invalid_verification_code` sehingga gateway tidak memerlukan penanganan khusus penyedia.

### Tujuan

Menyediakan verifikasi kata sandi sekali pakai berbasis waktu untuk gateway TFA.

### Alur Penyiapan

1. Adaptor membuat secret Base32.
2. Adaptor mengembalikan `manualSecret` dan `qrSvg` untuk UI penyiapan.
3. Pengguna mengonfirmasi penyiapan dengan kode 6 digit.
4. Jika berhasil, status menyimpan `secret`, `algorithm`, `digits`, dan `period`.

### Aturan Verifikasi

- Panjang token: `6` digit.
- Langkah waktu: `30` detik.
- Toleransi waktu: jendela sebelumnya, saat ini, dan berikutnya.
- Algoritma default: `SHA256`.
- Algoritma yang didukung: `SHA1`, `SHA256`, `SHA512`.

## Keamanan

Akses Verifikasi Autentikator diatur oleh pemanggil dan gerbang pemilik. Mengaktifkan komponen tidak menambah izin akun.

## Referensi

Kode sumber dan metadata paket: `src/adapters/tfa/totp/`.
