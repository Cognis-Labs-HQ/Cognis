# Penggunaan

Prosedur praktis untuk OpenID Connect.

## Prasyarat

Adapter OIDC bawaan tidak memiliki klien protokol terpasang. createAdapter() mengembalikan klien null; integrasi harus memasok klien tervalidasi melalui setClient(). Konfigurasi saja tidak mengaktifkan masuk.

## Contoh

Dapatkan token akses valid melalui aplikasi klien lalu kirim memakai penyedia autentikasi Cognis yang dikonfigurasi. Uji identitas nonadministrator dahulu.

## Hasil yang Diharapkan

Tanpa klien terinjeksi, autentikasi menghasilkan null meski formulir lengkap. Uji keberhasilan hanya dengan integrasi penyedia klien.

## Pemecahan Masalah

Periksa integrasi klien dahulu. Discovery, tanda tangan, dan transportasi milik klien terinjeksi; pemetaan peran tidak memasok klien.
