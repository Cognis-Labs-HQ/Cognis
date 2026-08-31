# Klien browser Pesan

Klien browser Pesan memungkinkan modul mencantumkan pesan ruang, membuka ruang privat, dan mengirim pesan melalui kontrak API terautentikasi milik adaptor Social Messages.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `social:messagesUiClient`, lalu panggil `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, atau `sendRoomMessage(roomId, payload)` dari kode browser.

## Spesifikasi teknis

Klien mengembalikan `Response` asli agar pemanggil menangani status dan payload. Klien mengodekan ID ruang untuk URI, mempertahankan pengetahuan rute di adaptor pemilik, meneruskan token akses opsional dan penekanan penolakan akses, mengirim penulisan sebagai JSON, dan hanya tersedia ketika gateway Social serta adaptor Messages aktif.

## Kontrak penyedia VoIP peramban

Messages menampilkan tindakan panggilan video pada percakapan langsung dan grup ketika penyedia peramban mengontribusikan capability `voip:startCall` ke `uiCtx.capabilities`. Penyedia menerima identitas ruang, identitas akun dan metadata tampilan setiap anggota percakapan, penanda sumber `messages`, serta permintaan tampilan `pip`. Penyedia bertanggung jawab membuat rapat, mengundang peserta, dan memasang permukaan panggilan sebagai jendela gambar-dalam-gambar pada halaman saat ini.
