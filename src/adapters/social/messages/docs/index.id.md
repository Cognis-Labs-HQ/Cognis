# Klien browser Pesan

Klien browser Pesan memungkinkan modul mencantumkan pesan ruang, membuka ruang privat, dan mengirim pesan melalui kontrak API terautentikasi milik adaptor Social Messages.

## Contoh penggunaan

Impor `uiCtx`, wajibkan `social:messagesUiClient`, lalu panggil `listRoomMessages(roomId, options)`, `openPrivateRoom(payload, options)`, atau `sendRoomMessage(roomId, payload)` dari kode browser.

## Spesifikasi teknis

Klien mengembalikan `Response` asli agar pemanggil menangani status dan payload. Klien mengodekan ID ruang untuk URI, mempertahankan pengetahuan rute di adaptor pemilik, meneruskan token akses opsional dan penekanan penolakan akses, mengirim penulisan sebagai JSON, dan hanya tersedia ketika gateway Social serta adaptor Messages aktif.

Kapabilitas publik `social:messages:deleteChatroom` menerima ID ruang dan ID akun pelaku. Kapabilitas ini menghapus ruang beserta data terkait secara permanen jika pelaku membuat ruang tersebut atau menjadi satu-satunya peserta yang tersisa.

## Kontrak penyedia VoIP peramban

Messages meminta kapabilitas peramban `voip:startCall` milik penyedia untuk menyelesaikan setiap percakapan langsung atau grup secara mandiri. Penyedia menerima identitas ruang, identitas akun dan metadata tampilan setiap anggota, penanda sumber `messages`, serta tindakan `component` dan `navigate` yang didukung. Hasil `null` menyembunyikan kamera untuk ruang tersebut. Hasil `component` memberikan UUID komponen, ID rute, konteks rapat, dan mode opsional agar Cognis memiliki panggung sementara, memasang jendela komponen, lalu menghapus panggung saat ditutup atau gagal. Hasil `navigate` memberikan URL dengan asal yang sama, seperti `/meetings/<meetingId>?start=1`, kepada router aplikasi. Dengan demikian, penyedia menentukan apakah suatu ruang boleh membuat panggilan sementara, membuka rapat yang ada, atau mengalihkan pengguna tanpa mengubah tata letak Messages secara langsung.
