# Modul Jitsi Meet

## Ikhtisar

Modul Jitsi Meet menambahkan ruang video langsung antar dua pengguna di Cognis. Modul ini sepenuhnya berada di `src/modules/jitsi-meet` dan membawa rute API, halaman UI, kontribusi navbar, bagian admin, berkas bahasa, dan dokumentasinya sendiri.

Admin hanya mengatur URL dasar Jitsi. Pengguna memulai atau melanjutkan sesi dengan satu peserta lain.

## Tanggung Jawab

- Menyimpan pengaturan modul (`baseUrl`) di `jitsi_meet_settings`.
- Menyimpan entitas meeting di `jitsi_meetings` dengan FK peserta ke `accounts(id)`.
- Menjalankan pemeriksaan pre-flight peserta sebelum data meeting dikirim.
- Membuat slug ruang deterministik per pasangan peserta.
- Menyediakan UI meetings yang menautkan chat native Cognis dengan pencarian runtime DM room.

Tidak bertanggung jawab untuk: orkestrasi classroom, provisioning Jitsi di level adapter, atau memaksa persetujuan pengguna.
