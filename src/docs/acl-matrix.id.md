# Matriks ACL

## Ikhtisar

Matriks ACL mendefinisikan tindakan apa yang boleh dilakukan oleh setiap peran di Cognis. Peran ditetapkan saat pembuatan akun atau oleh admin setelahnya; pendaftaran mandiri selalu menghasilkan peran `user`.

Cognis memiliki empat peran. `user` adalah default untuk semua aktivitas pelajar standar. `teacher` memberikan akses ke API khusus instruktur. `moderator` menambahkan hak moderasi komunitas. `admin` memiliki akses platform penuh.

## Matriks Peran

| Kemampuan                               | user | teacher | moderator | admin |
| --------------------------------------- | ---: | ------: | --------: | ----: |
| Pendaftaran mandiri                     |   ✅ |      ✅ |        ✅ |    ✅ |
| Lihat/edit profil sendiri               |   ✅ |      ✅ |        ✅ |    ✅ |
| Buat postingan                          |   ✅ |      ✅ |        ✅ |    ✅ |
| Follow/unfollow pengguna                |   ✅ |      ✅ |        ✅ |    ✅ |
| Upload/download file                    |   ✅ |      ✅ |        ✅ |    ✅ |
| Akses API khusus guru                   |   ❌ |      ✅ |        ❌ |    ✅ |
| Hapus postingan pengguna mana pun       |   ❌ |      ❌ |        ✅ |    ✅ |
| Hapus file apa pun                      |   ❌ |      ❌ |        ❌ |    ✅ |
| Konfigurasi batas ukuran file           |   ❌ |      ❌ |        ❌ |    ✅ |
| Instal/kelola modul                     |   ❌ |      ❌ |        ❌ |    ✅ |
| Kelola konfigurasi penyedia autentikasi |   ❌ |      ❌ |        ❌ |    ✅ |
| Endpoint diagnostik sistem              |   ❌ |      ❌ |        ❌ |    ✅ |

## Catatan Peran

- **user** — Peran default yang diberikan saat pendaftaran mandiri.
- **teacher** — Akses API tingkat lanjut untuk fitur instruktur; ditetapkan oleh admin.
- **moderator** — Hak moderasi komunitas; tidak ada akses ke konfigurasi sistem atau admin.
- **admin** — Akses platform penuh; dibuat di luar jalur melalui `cognisctl user:create`.
