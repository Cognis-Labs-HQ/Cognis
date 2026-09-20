# Kepatuhan Tinjauan PR 225

**Cabang Fitur:** pr-225-review-compliance

## Akun Eksternal Lebih Aman

Pembuatan akun eksternal kini mempertahankan batas penyedia saat menurunkan nama akun, memakai ruang nama adapter yang tervalidasi ketika label penyedia tidak sesuai, dan membatalkan komit pendaftaran yang gagal tanpa menandai identitas terautentikasi sebagai sengaja dihapus.

## Semantik Formulir yang Benar

Grup radio wajib kini tetap tidak valid sampai opsi dipilih. Sinkronisasi profil memakai gaya tindakan destruktif karena dapat mengganti data profil.

## Kepatuhan Versi

Kontrak API dan semua komponen yang terpengaruh kini menerbitkan versi serta batas atas dependensi teruji yang selaras. Orkestrasi autentikasi juga dipisahkan menjadi berkas sumber yang mudah ditinjau, dan pengujian administrasi LDAP kini memakai nama akun berlingkup penyedia yang kanonis.

## Commit

- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
