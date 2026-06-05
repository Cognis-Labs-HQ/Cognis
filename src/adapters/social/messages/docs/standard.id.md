# Pesan

## Ringkasan

Adapter pesan menyediakan percakapan privat 1:1 dan grup di atas Social
Gateway. Ruang obrolan, keanggotaan, dan isi pesan disimpan di database. Isi
pesan dienkripsi di sisi klien dengan kunci per-ruang, lalu dibungkus lagi saat
tersimpan menggunakan `DATA_ENCRYPTION_KEY`.

## Endpoint

Semua endpoint berada di bawah `/api/v1/social/messages`. Autentikasi wajib, kecuali
`GET /messages/ping`.

| Metode | Path                                                | Deskripsi                                                                      |
| ------ | --------------------------------------------------- | ------------------------------------------------------------------------------ |
| GET    | `/messages/ping`                                    | Cek ketersediaan adapter (`{ ready: true }`).                                  |
| GET    | `/messages/users/lookup?q=…`                        | Cari profil penerima pesan.                                                    |
| GET    | `/messages/rooms`                                   | Daftar ruang pengguna saat ini dengan pratinjau dan jumlah belum dibaca.       |
| POST   | `/messages/rooms`                                   | Buat DM/grup; DM bisa dimulai sebagai permintaan tertunda.                     |
| GET    | `/messages/requests`                                | Daftar permintaan pesan masuk yang masih tertunda.                             |
| POST   | `/messages/requests/:id/approve`                    | Setujui permintaan dan buka/buat ruang DM.                                     |
| POST   | `/messages/requests/:id/reject`                     | Tolak permintaan dan keluarkan penerima dari ruang DM yang sempat disiapkan.   |
| GET    | `/messages/rooms/:id`                               | Metadata ruang dan anggota.                                                    |
| GET    | `/messages/rooms/:id/key`                           | Ambil kunci AES-GCM ruang (hanya anggota).                                     |
| GET    | `/messages/rooms/:id/messages?before&limit`         | Riwayat berpaginasi (penerima permintaan masuk tetap kosong sampai disetujui). |
| POST   | `/messages/rooms/:id/messages`                      | Tambah pesan (`ciphertext`, `iv`, opsional `authTag`).                         |
| POST   | `/messages/rooms/:id/messages/:messageId/reactions` | Toggle reaksi emoji pada pesan.                                                |
| POST   | `/messages/rooms/:id/read`                          | Tandai ruang sudah dibaca hingga saat ini.                                     |
| GET    | `/messages/rooms/:id/typing`                        | Daftar pengguna yang sedang mengetik (kecuali peminta).                        |
| POST   | `/messages/rooms/:id/typing`                        | Perbarui status mengetik anggota saat ini.                                     |
| POST   | `/messages/rooms/:id/members`                       | Tambah anggota (khusus owner/admin).                                           |
| DELETE | `/messages/rooms/:id/members/:handle`               | Hapus anggota (keluar sendiri atau dikeluarkan owner).                         |

## Kelayakan

Pengguna **A** bisa membuka DM dengan **B** jika:

1. tidak ada pemblokiran dua arah,
2. kedua profil terlihat,
3. keduanya saling mengikuti.

Jika hanya syarat (3) yang tidak terpenuhi, `POST /messages/rooms` dapat
mengembalikan `202` dengan status permintaan tertunda.

Riwayat permintaan yang pernah disetujui dapat melewati syarat saling mengikuti,
tetapi tetap tidak boleh melewati aturan blokir atau visibilitas.

## Model Ancaman

- **Transit**: Dilindungi oleh TLS.
- **Database**: Isi pesan dibungkus dua kali (enkripsi klien + pembungkusan
  at-rest server dengan `DATA_ENCRYPTION_KEY`).
- **Bukan E2E penuh**: Jika server kompromi, konten bisa didekripsi.
- **Metadata**: Keanggotaan, waktu kirim, dan panjang ciphertext tetap terlihat
  oleh operator.

## Integrasi Notifikasi

Saat pesan baru ditambahkan, adapter mengirim amplop notifikasi per anggota lain
dengan kategori `messages` dan `actionUrl` `/messages/<room-id>` ke Notify
Gateway. Pengaturan mute per ruang dan preferensi kategori dapat menonaktifkan
pengiriman.
