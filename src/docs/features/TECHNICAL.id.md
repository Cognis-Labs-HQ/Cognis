# Referensi Teknis

Katalog ini memetakan fitur terpasang ke komponen pemilik antarmuka dan aturan aksesnya.

## Antarmuka

[Study](/docs/gateways/study/technical) menemukan penyedia bahasa; [Library](/docs/adapters/study/library/technical) memiliki konten dan impor; [Flashcards](/docs/adapters/study/flashcards/technical) memiliki dek serta latihan. [Calendar](/docs/gateways/calendar/technical) memiliki acara, [Messages](/docs/adapters/social/messages/technical) percakapan, dan [Share](/docs/gateways/share/technical) tautan serta penerima terdelegasi.

## Konfigurasi

Administrator memilih komponen aktif dan pengaturan penyedia. Akun memilih bahasa belajar serta preferensi. Email memerlukan pengirim yang dikonfigurasi dan kebijakan akun yang sesuai; skema SMTP atau adaptor SSO terpasang saja tidak menyediakan koneksi eksternal yang bekerja.

## Perilaku

Navigasi dan aktivitas berasal dari kontribusi aktif serta akses akun. Dokumentasi fitur bukan inventaris instalasi. [UI](/docs/ui/technical) mendefinisikan routing, aset offline, dan perilaku offline terikat akun; referensi domain menentukan tindakan yang dapat diantrekan dan yang memerlukan koneksi.

## Keamanan

Visibilitas, keanggotaan kelas, kepemilikan, moderasi, dan grant terdelegasi diperiksa terpisah. Kontrol berbasis peran tidak mengotorisasi operasi backend. Data bahasa dan tautan berbagi tidak boleh melewati kebijakan pemilik domain.

## Referensi

- [src/gateways/study/bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/study/bootstrap.ts)
- [src/gateways/calendar/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/calendar/bootstrap/index.ts)
- [src/gateways/share/bootstrap/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/share/bootstrap/index.ts)
