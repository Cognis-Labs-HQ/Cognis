# Penggunaan

Prosedur praktis untuk Masuk.

## Prasyarat

Gunakan penyedia aktif; pendaftaran mungkin memerlukan undangan.

## Contoh

Masuk, selesaikan verifikasi bila diminta, buka keamanan akun di Pengaturan, lalu keluar setelah selesai.

Dapatkan `auth:authorizeAccountTarget` versi 1 melalui `system:contracts`. Kirim `{ actor: { sub, role }, accountId, allowSelf }` menggunakan klaim dari penjaga Auth yang diinjeksi. Pengelolaan pengguna menetapkan `allowSelf: false`; layanan mandiri menetapkannya ke `true`.

Keputusan yang diizinkan berbentuk `{ allowed: true, accountId, isCurrent }`. Periksa target yang tepat dan panggil `isCurrent()` tepat sebelum menggunakannya. Penolakan berbentuk `{ allowed: false, status, code }`. Kontrak yang hilang atau tidak kompatibel berarti tidak tersedia, bukan izin memakai pemeriksaan yang lebih lemah.

Batasan opsional `allowFounder` bernilai `true` bila dihilangkan. Nilai `false` menolak akun pendiri dengan `403 protected_founder_account`, terlepas dari peran aktor atau target. Nilai nonboolean yang disertakan menghasilkan `400 bad_request`. Tindakan Users biasa dan TFA mempertahankan perilaku pendiri yang ada; hanya deprovision terlindungi meminta batasan tambahan ini. Penyedia alternatif harus menerapkan batasan ini sebagai bagian kontrak versi 1, bukan mengabaikannya diam-diam.

Dengan `allowSelf: true` dan `allowFounder: false`, layanan mandiri juga membaca metadata otoritatif dan dapat ditolak untuk pendiri, akun hilang, atau metadata tidak tersedia. Menghilangkan batasan pendiri mempertahankan layanan mandiri tanpa pembacaan metadata.

## Hasil yang Diharapkan

Cognis membuat sesi terikat akun; aturan penyedia dan akun tetap berlaku.

## Pemecahan Masalah

Periksa penyedia, persyaratan verifikasi, dan status akun. Pembatalan membuka keyring bukan kegagalan masuk.
