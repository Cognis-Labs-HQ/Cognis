# Penggunaan

Prosedur praktis untuk Masuk SAML.

## Prasyarat

Adapter SAML bawaan tidak memiliki klien protokol terpasang. createAdapter() mengembalikan klien null; integrasi harus memasok klien tervalidasi melalui setClient(). Konfigurasi saja tidak mengaktifkan masuk.

## Contoh

Simpan konfigurasi SAML lalu uji assertion bertanda tangan dari akun organisasi biasa. Periksa email dan grup administrator yang dipetakan.

## Hasil yang Diharapkan

Tanpa klien terinjeksi, autentikasi menghasilkan null meski formulir lengkap. Uji keberhasilan hanya dengan integrasi penyedia klien.

## Pemecahan Masalah

Periksa integrasi klien dahulu. Discovery, tanda tangan, dan transportasi milik klien terinjeksi; pemetaan peran tidak memasok klien.
