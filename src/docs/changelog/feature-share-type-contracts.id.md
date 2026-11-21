# Kontrak Share Bertipe

**Cabang Fitur:** feature-share-type-contracts

## Hasil Token Bertipe

Share 1.9.9 mendeklarasikan bidang token yang dikembalikan oleh kapabilitas penerbitan, pembaruan, dan daftar, termasuk metadata, kedaluwarsa, penerima, dan kapabilitas yang diberikan. Callback bootstrap dan fixture kueri terstruktur menggunakan kontrak eksplisit. Pemeriksaan pemilik dan pencabutan melalui daftar kapabilitas kosong tetap berlaku.

## Pengujian dan Keamanan

Pengujian sintetis mencakup hasil token tersimpan, penolakan pembaruan oleh bukan pemilik, dan pembersihan profil tamu. Pemeriksaan penerima, kata sandi, adaptor, dan kedaluwarsa mempertahankan perilaku sebelumnya.

## Komit

- [411baf079785e6e470970301216f37c7b73fceba](https://github.com/Cognis-Labs-HQ/Cognis/commit/411baf079785e6e470970301216f37c7b73fceba)
- [4b940788bcf224e9e93de8f4c1557ea8eef418c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/4b940788bcf224e9e93de8f4c1557ea8eef418c0)
