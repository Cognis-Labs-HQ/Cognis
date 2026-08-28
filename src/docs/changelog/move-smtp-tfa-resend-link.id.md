# SMTP TFA: Resend & Batas Kirim

**Feature Branch:** copilot/move-smtp-tfa-resend-link

## Ringkasan

Tautan "Kirim ulang kode email" pada layar autentikasi dua faktor SMTP kini
tampil di baris tersendiri tepat di bawah kolom input kode, bukan sebaris
dengan area tindakan.

Countdown batas pengiriman SMTP kini dipulihkan dengan benar dan mulai
berjalan segera saat kondisi batas terdeteksi, baik pada tantangan awal
maupun setelah percobaan kirim ulang yang gagal.

Tantangan login berbasis SMTP kini langsung berpindah ke prompt TFA segera
setelah email verifikasi masuk antrean pengiriman, alih-alih menunggu
pengiriman SMTP selesai. Jika antrean masih berada dalam jendela batas laju
penerima, UI login langsung menerima hitung mundurnya dan kode terakhir yang
masih berlaku tetap dapat dipakai sampai pengiriman antrean dijalankan.

Layar TFA kini tetap dipertahankan saat viewport browser beralih antara
tata letak mobile dan desktop. Sebelumnya, mengubah ukuran jendela saat
berada di langkah TFA akan mereset halaman ke layar masuk. Prompt TFA yang
aktif kini dipulihkan secara otomatis setelah render ulang tata letak.

Saat alur login SMTP mengirim kode secara otomatis, toast kini mengonfirmasi
bahwa kode sudah dikirim alih-alih memberi peringatan tentang hitung mundur
kirim ulang. Tautan kirim ulang tetap menampilkan hitung mundur agar batas laju
saat ini tetap jelas.

Kode SMTP tidak lagi dikirim saat halaman dimuat jika beberapa metode TFA
tersedia. Server kini hanya memulai challenge ketika pengguna memiliki tepat
satu metode yang dikonfigurasi. Jika beberapa metode tersedia, tidak ada
challenge yang dimulai hingga pengguna secara eksplisit memilih tab metode —
saat itulah klien memicu challenge melalui endpoint resend. Perpindahan tab
kembali ke SMTP tidak mengirim ulang kode selama challenge yang ada masih
aktif.

## File/komponen yang diubah

- `src/gateways/notify/gateway.ts`
- `src/gateways/notify/bootstrap.ts`
- `src/gateways/tfa/bootstrap.ts`
- `src/gateways/tfa/gateway.ts`
- `src/gateways/tfa/ui/login-flow.js`
- `src/gateways/tfa/ui/languages/*/strings.xml`
- `src/gateways/tfa/tests/login-flow-ui.test.js`
- `src/gateways/tfa/tests/tfa-gateway.test.ts`
- `src/gateways/tfa/manifest.json`
- `src/adapters/notify/smtp/smtp-notification-sender.ts`
- `src/adapters/tfa/smtp/index.ts`
- `src/gateways/notify/tests/notification-gateway.test.ts`
- `src/adapters/notify/smtp/tests/smtp-notification-sender.test.ts`
- `src/adapters/tfa/smtp/tests/smtp-adapter.test.ts`
- `src/docs/versions.en.md`

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/460f399ae3701867d002e0006d3a71a7dbf9e3c8
