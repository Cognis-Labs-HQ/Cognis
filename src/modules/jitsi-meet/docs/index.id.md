# Modul Jitsi Meet

## Ikhtisar

Modul Jitsi Meet adalah modul mandiri (`src/modules/jitsi-meet`) yang menyediakan orkestrasi meeting yang dikendalikan Cognis untuk pasangan pengguna serta entitas kelas/manual.

Fitur utama:

- entri global **Pertemuan** di navbar,
- halaman Meetings berbasis Page Composer dengan panel terpisah yang bisa dikustomisasi (jendela meeting, kontrol peserta, jendela chat),
- pengaturan instance Jitsi dari Administration,
- entitas meeting reusable berbasis DB dengan penegakan keanggotaan peserta.

## Model Keamanan

- URL meeting dibuat di server dari slug ruang deterministik dan tidak ditampilkan sebagai metadata URL yang dapat disalahgunakan.
- Chat bawaan Jitsi dinonaktifkan; modul memakai tautan chat native Cognis.
- Keanggotaan peserta ditegakkan oleh Cognis melalui pemeriksaan DB modul.
- Hanya pemilik meeting yang dapat mengubah anggota peserta.
