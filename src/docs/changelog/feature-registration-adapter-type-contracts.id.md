# Kontrak Penyedia Bertipe

**Cabang Fitur:** feature-registration-adapter-type-contracts

## Kontrak Penyedia Bertipe

Registrasi meneruskan masukan undangan lengkap, termasuk email opsional, melalui kontrak penyedia. Registrasi publik memerlukan operasi pendaftaran akun; registrasi token juga memerlukan pencarian dan penghapusan akun. LDAP menyediakan bentuk hasil pengujian direktori dan kredensial serta menggunakan opsi pencarian berhalaman yang didukung. Detail akun lokal mencakup peran dan penyedia. TOTP hanya mendeklarasikan perender QR SVG berbasis Promise yang digunakan. Aturan autentikasi, otorisasi undangan, dan verifikasi TOTP tidak berubah.

## Dokumentasi dan Lingkup Uji

Dokumentasi registrasi mencakup contoh kapabilitas publik dan kontrak teknis. Fixture pengujian adapter token tetap berada bersama satu-satunya pengujian yang menggunakannya.

## Komit

- [3492bfe6761c6c7100b8c2744c128884078680fc](https://github.com/Cognis-Labs-HQ/Cognis/commit/3492bfe6761c6c7100b8c2744c128884078680fc)
