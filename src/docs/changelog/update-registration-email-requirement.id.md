# Email Opsional saat Registrasi

**Feature Branch:** copilot/update-registration-email-requirement

## Email tidak lagi wajib diisi saat Metode Validasi Pengguna diatur ke Tidak Ada

Apabila Metode Validasi Pengguna di Administrasi > Keamanan diatur ke Tidak Ada, kolom email pada halaman registrasi kini bersifat opsional. Pemberitahuan verifikasi email juga disembunyikan dalam mode ini. Server tidak lagi mewajibkan verifikasi email atau menghapus akun yang baru didaftarkan tanpa alamat email ketika mode validasi diatur ke Tidak Ada.

## Commits

- [92f2856](https://github.com/Cognis-Labs-HQ/Cognis/commit/92f2856698dacd9bf208f2ffa3d0b5e77c4971fa)
