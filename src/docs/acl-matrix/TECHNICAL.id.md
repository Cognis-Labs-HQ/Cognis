# Referensi Teknis

Kebijakan akses menggabungkan peringkat peran akun dengan pemeriksaan kepemilikan, keanggotaan, dan visibilitas sesuai operasi.

## Antarmuka

`AccessRole` dan `RoleAccessPolicy` diekspor Core. `hasMinRole(role, minRole)` membandingkan peringkat; `isRoleAllowed(role, { minRole, onlyRole })` menerapkan kedua syarat. Guard autentikasi menyelesaikan klaim sebelum kebijakan rute.

## Konfigurasi

`minRole` mengizinkan peran tersebut dan peringkat lebih tinggi. `onlyRole` hanya mengizinkan peran tepat tersebut, termasuk menolak peringkat lebih tinggi. Kepemilikan, visibilitas, keanggotaan, dan berbagi diperiksa terpisah.

## Perilaku

Urutan peran ialah `user < teacher < moderator < admin < owner`. Pendaftaran mandiri membuat `user`; `founder` bukan AccessRole dan undangan mengikuti kebijakan Pendaftaran. Peringkat minimum bukan matriks izin lengkap untuk profil, berkas, ruang, atau kelas.

## Keamanan

Periksa peran dan akses saat eksekusi. Kontrol tersembunyi bukan batas otorisasi; deskripsi peran tidak mengesampingkan onlyRole atau keanggotaan saat ini.

## Referensi

- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
- [src/gateways/auth/guard.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/auth/guard.ts)
