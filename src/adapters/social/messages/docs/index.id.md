# Klien browser Pesan

Klien browser Pesan memungkinkan modul mencantumkan pesan ruang, membuka ruang privat, dan mengirim pesan melalui kontrak API terautentikasi milik adaptor Social Messages.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `social:messagesUiClient`, lalu panggil `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, atau `sendRoomMessage(roomId, payload)` dari kode browser.

## Spesifikasi teknis

Klien mengembalikan `Response` asli agar pemanggil menangani status dan payload. Klien mengodekan ID ruang untuk URI, mempertahankan pengetahuan rute di adaptor pemilik, meneruskan token akses opsional dan penekanan penolakan akses, mengirim penulisan sebagai JSON, dan hanya tersedia ketika gateway Social serta adaptor Messages aktif.

Kapabilitas publik `social:messages:deleteChatroom` menerima ID ruang dan ID akun pelaku. Kapabilitas ini menghapus ruang beserta data terkait secara permanen jika pelaku membuat ruang tersebut atau menjadi satu-satunya peserta yang tersisa.

Adaptor juga menerbitkan `social:messages:resolveRoomMembership`. Dengan ID ruang dan ID akun pemohon, capability ini hanya mengizinkan anggota ruang aktif dan mengembalikan ID akun anggota aktif. Penyedia memakai batas ini alih-alih membaca persistensi Messages secara langsung.

Pemilih Ruang Baru memakai parameter `category: "user"` dan `typeFilter: "user"` dari popup pencarian bersama, sama seperti konsumen khusus pengguna lain seperti Jitsi Meet, sehingga hanya hasil pengguna yang ditawarkan untuk membuat percakapan.

Panggilan masuk ditampilkan sebagai bilah tindakan kontribusi tepat sebelum tajuk utas, dengan label di kiri serta tindakan SVG Jawab dan Tolak milik penyedia di kanan. Peristiwa panggilan historis tetap menjadi catatan lini masa biasa, bukan prompt interaktif.
