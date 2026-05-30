# SMTP TFA: Resend & Batas Kirim

## Ringkasan

Tautan "Kirim ulang kode email" pada layar autentikasi dua faktor SMTP kini
tampil di baris tersendiri tepat di bawah kolom input kode, bukan sebaris
dengan area tindakan.

Countdown batas pengiriman SMTP kini dipulihkan dengan benar dan mulai
berjalan segera saat kondisi batas terdeteksi, baik pada tantangan awal
maupun setelah percobaan kirim ulang yang gagal.

Apabila tantangan login awal dibatasi laju pengiriman (artinya tidak ada
email verifikasi yang terkirim), kini ditampilkan notifikasi peringatan yang
memberi tahu pengguna bahwa kode baru-baru ini telah dikirim dan kapan kode
baru dapat diminta. Ini mengatasi kondisi tampak diam yang terjadi ketika
pengguna dibatasi sebelum mencapai layar TFA.

Layar TFA kini tetap dipertahankan saat viewport browser beralih antara
tata letak mobile dan desktop. Sebelumnya, mengubah ukuran jendela saat
berada di langkah TFA akan mereset halaman ke layar masuk. Prompt TFA yang
aktif kini dipulihkan secara otomatis setelah render ulang tata letak.

## File/komponen yang diubah

- `src/gateways/tfa/ui/login-flow.js`
- `src/ui/app/login/index.js`
- `src/ui/styles/login.css`
- `src/gateways/tfa/ui/languages/*/strings.xml`
