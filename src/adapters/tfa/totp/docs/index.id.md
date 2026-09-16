# Adaptor TOTP

## Tujuan

Menyediakan verifikasi kata sandi sekali pakai berbasis waktu untuk gateway TFA.

## Alur Penyiapan

1. Adaptor membuat secret Base32.
2. Adaptor mengembalikan `manualSecret` dan `qrSvg` untuk UI penyiapan.
3. Pengguna mengonfirmasi penyiapan dengan kode 6 digit.
4. Jika berhasil, status menyimpan `secret`, `algorithm`, `digits`, dan `period`.

## Aturan Verifikasi

- Panjang token: `6` digit.
- Langkah waktu: `30` detik.
- Toleransi waktu: jendela sebelumnya, saat ini, dan berikutnya.
- Algoritma default: `SHA256`.
- Algoritma yang didukung: `SHA1`, `SHA256`, `SHA512`.

## Konfigurasi

Adaptor menyediakan satu pengaturan admin:

- `algorithm` — algoritma HMAC untuk verifikasi penyiapan dan verifikasi login.
