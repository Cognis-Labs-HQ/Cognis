# Reaksi & Ekspansi Emoji

**Cabang Fitur:** copilot/tweak-message-reactions-and-fix-manifests

## Ringkasan

Reaksi pesan yang sudah ada kini selalu terlihat meskipun kursor tidak melayang di atas pesan. Strip reaksi cepat kini menampilkan lima emoji yang dapat disesuaikan dan secara otomatis memprioritaskan emoji yang paling sering digunakan pengguna. Tombol "···" baru membuka pemilih emoji lengkap yang dapat dicari dari lebih dari 300 emoji.

Penggunaan emoji kini dilacak per pengguna di database, bukan localStorage. Tabel baru `chat_emoji_usage` menyimpan hitungan pilihan setiap pengguna dan dikueri saat halaman dimuat. Lima slot reaksi cepat tidak lagi memiliki default yang dikodekan keras — jika tidak ada riwayat penggunaan, strip diisi dari entri pertama dalam katalog emoji.

Semua nama emoji dalam katalog kini merupakan kunci lokalisasi yang diselesaikan melalui file bahasa Social Gateway dalam bahasa Inggris, Jerman, Indonesia, dan Jepang. Pencarian di picker dan tooltip tombol menampilkan nama yang telah diterjemahkan.

## File dan Komponen yang Diubah

- `src/gateways/social/ui/emojis.json` — nama emoji sebagai kunci i18n
- `src/gateways/social/ui/languages/*/strings.xml` — file bahasa Social Gateway baru dengan 366 nama emoji yang diterjemahkan
- `src/adapters/social/messages/store.ts` — tabel baru `chat_emoji_usage`; metode `incrementEmojiUsage` dan `getTopEmojiUsage`
- `src/adapters/social/messages/routes.ts` — rute baru `GET/POST /api/v1/social/messages/emoji-usage`
- `src/adapters/social/messages/ui/app.js` — penggunaan emoji berbasis server, resolusi nama i18n, tanpa default yang dikodekan keras
- `src/adapters/social/messages/ui/messages.css` — CSS terpisah: chip reaksi selalu terlihat, tombol tambah hanya saat hover
- `src/adapters/social/messages/ui/languages/en/strings.xml` — kunci i18n baru
- `src/adapters/social/messages/ui/languages/de/strings.xml` — terjemahan Jerman
- `src/adapters/social/messages/ui/languages/id/strings.xml` — terjemahan Indonesia
- `src/adapters/social/messages/ui/languages/ja/strings.xml` — terjemahan Jepang
- `src/adapters/social/messages/tests/store.test.ts` — pengujian untuk skema dan metode penggunaan emoji
- `src/adapters/social/messages/manifest.json` — kenaikan versi 1.4.0 → 1.4.1

## Tautan Commit

- [2a9c702](https://github.com/Cognis-Labs-HQ/Cognis/commit/2a9c702)
- [295496e](https://github.com/Cognis-Labs-HQ/Cognis/commit/295496e)
- [1e40511](https://github.com/Cognis-Labs-HQ/Cognis/commit/1e40511)
- [e19669d](https://github.com/Cognis-Labs-HQ/Cognis/commit/e19669d)

## Komit
