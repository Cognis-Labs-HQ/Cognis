# Changelog — Ekspansi flow ctx

**Feature Branch:** N/A

## Ringkasan

Sistem flow `ctx` kini menjadi satu-satunya jalur untuk penyediaan pengguna,
pengiriman pesan, dan pembuatan rapat. Fallback langsung ke store yang lama
telah dihapus dari rute-rute tersebut. API mengembalikan 503 apabila flow yang
diperlukan tidak tersedia, alih-alih diam-diam beralih ke jalur kode yang tidak
terorkestasi.

Semua gateway sekunder (TFA, registrasi, studi, kalender, notify) kini
mendaftarkan hook `bootstrap-platform/register-flows` agar ikut berpartisipasi
dalam bootstrap flow ketika auth gateway tersedia. Setiap pendaftaran dijaga
dengan `hasFlow` sehingga lingkungan pengujian terisolasi tetap berjalan tanpa
tumpukan gateway lengkap.

Hook `validate-message` pada social gateway telah diperbarui untuk memvalidasi
kolom konten terenkripsi (`ciphertext` dan `iv`) alih-alih kolom teks biasa
`content`, sesuai dengan format wire yang sebenarnya.

Adapter messages kini mendaftarkan hook `persist-message` dan `fan-out` ke
dalam flow `send-message`. Handler kirim pesan di room-routes sepenuhnya
mendelegasikan ke flow ini dan membaca pesan yang disimpan dari hasil stage.

Modul Jitsi Meet kini mendaftarkan semua entri katalog flow MEETINGS dan
menambahkan hook untuk `construct-meetings-ui/resolve-providers` dan
`create-meeting/validate-request`.

Rute deprovision-user kini membaca `revokedTokenCount` dari hasil stage
`cleanup-dependencies` dan memeriksa hasil stage `authorize-request` untuk
kegagalan otorisasi (403).

## Komponen dan file yang diubah

- `src/api/routes/users/index.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/tfa/bootstrap/index.ts`
- `src/gateways/registration/bootstrap/index.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/study/bootstrap.ts`
- `src/gateways/calendar/bootstrap/index.ts`
- `src/modules/jitsi-meet/bootstrap.js`
- `src/adapters/social/messages/index.ts`
- `src/adapters/social/messages/routes/shared.ts`
- `src/adapters/social/messages/routes/room-routes.ts`
- `src/api/tests/users/user-routes.test.ts`
- `src/adapters/social/messages/tests/routes-notifications.test.ts`

## Commits
