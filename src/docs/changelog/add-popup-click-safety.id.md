# Keamanan Penutupan Formulir

**Cabang Fitur:** copilot/add-popup-click-safety

## Dialog konfirmasi sebelum membuang perubahan formulir yang belum disimpan

Popup yang berisi input formulir kini meminta konfirmasi sebelum ditutup — melalui klik latar belakang, tombol ×, atau tombol Escape — apabila ada kolom yang telah diubah. Klik "Buang" untuk menutup formulir; klik "Batal" untuk kembali ke isian yang sedang dikerjakan.

## Popup yang terpengaruh

Edit profil, ubah kata sandi, konfigurasi adaptor, undangan email, input pengguna, permohonan guru, dan undangan siswa semuanya mendapatkan perlindungan ini. API `openPopup` menerima opsi baru `closeProtection` yang mengaktifkan penjaga pada popup formulir apa pun dengan string i18n yang sudah diselesaikan.

## Komit

- [b943b35](https://github.com/Cognis-Labs-HQ/Cognis/commit/b943b359f0aff9872e9c4817e28c4b2381a16253)
