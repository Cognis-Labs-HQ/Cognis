# Kontrak Share Bertipe

**Cabang Fitur:** feature-share-type-contracts

## Hasil Token Bertipe

Share 1.9.9 mendeklarasikan bidang token yang dikembalikan oleh kapabilitas penerbitan, pembaruan, dan daftar, termasuk metadata, kedaluwarsa, penerima, dan kapabilitas yang diberikan. Callback bootstrap dan fixture kueri terstruktur menggunakan kontrak eksplisit. Pemeriksaan pemilik dan pencabutan melalui daftar kapabilitas kosong tetap berlaku.

## Pengujian dan Keamanan

Pengujian sintetis mencakup hasil token tersimpan, penolakan pembaruan oleh bukan pemilik, dan pembersihan profil tamu. Pemeriksaan penerima, kata sandi, adaptor, dan kedaluwarsa mempertahankan perilaku sebelumnya.

## Komit

- [f8c570ec93b88599220fcbf1ec5b18d617e01136](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8c570ec93b88599220fcbf1ec5b18d617e01136)
