# Gateway TFA & TOTP

## Tambah Gateway TFA Baru

Menambahkan gateway `tfa` khusus dengan penemuan adaptor di `src/adapters/tfa/*`, API metode pengguna, API siklus kode pemulihan, dan endpoint reset admin.

## Tambah Adaptor TOTP

Menambahkan adaptor `totp` di `src/adapters/tfa/totp` dengan verifikasi penyiapan dan verifikasi kode login.

## Integrasi Login dan Keamanan

Memperbarui alur login dan keamanan untuk prompt dua faktor, pengalihan setup wajib, toggle penegakan TFA di Administrasi, dan aksi reset TFA per pengguna.
