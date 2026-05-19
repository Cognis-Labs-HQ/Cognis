# Reaksi & Ekspansi Emoji

## Ringkasan

Reaksi pesan yang sudah ada kini selalu terlihat meskipun kursor tidak melayang di atas pesan. Strip reaksi cepat kini menampilkan lima emoji yang dapat disesuaikan dan secara otomatis memprioritaskan emoji yang paling sering digunakan pengguna. Tombol "···" baru membuka pemilih emoji lengkap yang dapat dicari dari lebih dari 300 emoji dalam file data baru di social gateway. Nomor versi adaptor social-messages juga diperbarui.

## File dan Komponen yang Diubah

- `src/gateways/social/ui/emojis.json` — file data emoji baru yang komprehensif (300+ emoji)
- `src/adapters/social/messages/ui/app.js` — sistem emoji cepat adaptif, pelacakan penggunaan, popup pemilih emoji lengkap
- `src/adapters/social/messages/ui/messages.css` — CSS terpisah: chip reaksi selalu terlihat, tombol tambah hanya saat hover
- `src/adapters/social/messages/ui/languages/en/strings.xml` — kunci i18n baru
- `src/adapters/social/messages/ui/languages/de/strings.xml` — terjemahan Jerman
- `src/adapters/social/messages/ui/languages/id/strings.xml` — terjemahan Indonesia
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — terjemahan Jepang
- `src/adapters/social/messages/manifest.json` — kenaikan versi 1.4.0 → 1.4.1

## Tautan Commit

- https://github.com/le-firehawk/Cognis/commit/2a9c702
