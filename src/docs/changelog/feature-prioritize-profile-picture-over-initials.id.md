# Mengutamakan Avatar...

## Ringkasan

Tampilan avatar di adaptor Pesan kini mengutamakan gambar profil asli daripada
inisial. Modul bersama baru di gateway sosial memusatkan pengambilan avatar
yang terautentikasi dan fallback inisial agar logika ini dapat digunakan
kembali di seluruh antarmuka UI adaptor sosial.

## File / Komponen yang Diubah

- **`src/gateways/social/ui/reuse/profile-avatar.js`** _(baru)_ — modul bersama
  yang mengekspor `fetchProfileAvatarBlobUrl`, `isProfileAvatarUnavailable`,
  `buildProfileAvatarMarkup`, `hydrateProfileAvatars`, dan
  `handleProfileAvatarError`.
- **`src/adapters/social/messages/ui/app.js`** — utilitas avatar duplikat
  dihapus; semua rendering avatar kini didelegasikan ke modul gateway bersama.
- **`src/adapters/social/messages/routes.ts`** — `enrichMembersWithProfiles`
  kini menyertakan `avatarKey` dalam bentuk anggota yang diperkaya.
- **`src/adapters/social/profile/ui/navbar.js`** — penyedia avatar bilah
  navigasi dasbor menggunakan `fetchProfileAvatarBlobUrl` dari modul bersama.
- **`src/adapters/social/messages/tests/bootstrap.test.ts`** — pernyataan
  regresi fallback avatar diperbarui untuk memeriksa lokasi modul bersama baru.
- **`src/adapters/social/messages/tests/routes.test.ts`** — pernyataan
  ditambahkan bahwa `GET /messages/rooms` mengembalikan nilai `avatarKey` anggota.

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/9f78b06
- https://github.com/le-firehawk/Cognis/commit/5399b86
