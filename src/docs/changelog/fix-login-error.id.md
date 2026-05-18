# Memperbaiki Permintaan Login yang Rusak

## Ringkasan

Permintaan login gagal dengan respons generik `400 Request failed` saat adapter
profil sosial tidak terpasang atau tabel `account_profiles` miliknya tidak
tersedia. Store DB adapter auth lokal melakukan join ke tabel tersebut ketika
memverifikasi kredensial dan membuat daftar akun, padahal autentikasi seharusnya
hanya bergantung pada data akun milik auth sendiri.

Perubahan ini menghapus ketergantungan lintas-adapter terhadap tabel profil dari
store auth lokal sehingga login tetap berhasil walaupun hanya tabel auth yang
ada. Perubahan ini juga menambahkan uji regresi yang akan gagal bila lookup auth
masih mencoba melakukan join ke `account_profiles`.

## File / Komponen yang Diubah

- `src/adapters/auth/local/store.ts` — menghapus join `account_profiles` dari
  verifikasi kredensial lokal dan daftar akun
- `src/adapters/auth/local/tests/store.test.ts` — menambahkan regresi untuk auth
  berbasis DB tanpa tabel profil sosial
- `src/adapters/auth/local/package.json` — menaikkan versi adapter Local Auth ke
  `0.2.3`
- `src/docs/versions.en.md` — memperbarui entri indeks versi adapter Local Auth

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/9ecb747f64a13830eb0d108fcd11d6bd5c0aa838
