# Pengamanan siklus token

**Cabang Fitur:** feature-token-lifecycle-enforcement

## Siklus token terbatas

Format token tersimpan 2 mewajibkan kolom keamanan eksplisit dan menolak format yang tidak didukung serta rekaman cacat atau ambigu. Sesi yang ditolak harus masuk kembali; tidak ada konversi format otomatis. Kredensial normal, terbatas, dan dicabut yang valid mempertahankan kewenangannya setelah mulai ulang. Kegagalan penyimpanan token dilaporkan, bukan diakui sebagai penulisan yang berhasil.

## Perubahan kebijakan TFA

Semua jalur penegakan TFA memakai alur kebijakan milik komponen. Menonaktifkan penegakan mencabut seluruh kredensial dengan penyiapan tertunda, termasuk kredensial lama administrator pelaksana, tanpa mengubah sesi normal. Pembersihan mendahului penulisan kebijakan dan aman diulang. Penyedia yang tidak tersedia atau kegagalan penulisan menghasilkan kegagalan; berkas token dan basis data bukan satu transaksi. Kegagalan penulisan kebijakan dapat mempertahankan kebijakan yang lebih ketat dengan kredensial tertunda yang sudah dicabut. Penggantian berkas atomik lokal tidak menjamin ketahanan terhadap kerusakan perangkat keras atau menyinkronkan beberapa proses server.

Penulisan pengaturan yang tidak terkait tidak menerapkan kebijakan TFA. Jika kapabilitas pembacaan TFA tersedia, pembacaan sistem dan penulisan tanpa kolom TFA memakai kebijakan terkini dari pemiliknya; kegagalan pembacaan menghasilkan kesalahan, bukan laporan bahwa penegakan dinonaktifkan. Tanpa kapabilitas opsional tersebut, preferensi tersimpan hanya merupakan salinan yang mungkin usang. Perubahan kebijakan eksplisit tetap memerlukan kapabilitas pemilik.

Alur kebijakan memerlukan operasi sekali pakai dan status eksekusi yang dipegang pemiliknya. Pemanggilan alur langsung dan pengulangan operasi yang ditangkap ditolak sebelum mutasi; integrasi harus memanggil kapabilitas kebijakan.

## Komit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/3a2f90aa804ed98e3ba72cc10724913cf14bbf84
