# Perubahan keanggotaan sosial yang konsisten

**Cabang Fitur:** feature-document-api-standard-for-membership-changes

## API dan kapabilitas keanggotaan yang sederhana

Anggota ruang obrolan dan pengikut profil kini memakai konvensi koleksi `POST`/`DELETE` yang terdokumentasi serta kapabilitas `ctx` yang sepadan untuk integrasi komponen tepercaya.

## Kapabilitas keanggotaan diekspor ke modul

Adaptor Messages kini menerbitkan keanggotaan ruang obrolan melalui `ctx` sistem dan penyimpanan kapabilitas gateway, sehingga modul eksternal seperti Jitsi Meet dapat menemukannya saat pengaktifan dan bootstrap.

## Keanggotaan obrolan rapat dipulihkan saat bergabung kembali

Menambahkan anggota ruang obrolan kini juga memulihkan keanggotaan yang diarsipkan. Integrasi rapat dapat memanggil operasi keanggotaan `add` yang idempoten dengan aman sebelum memuat obrolan setiap kali peserta bergabung, sehingga respons `403` berulang tidak terjadi setelah peserta sebelumnya keluar dari obrolan.

## Umpan balik tinjauan ditangani

Keanggotaan mengikuti profil kini hanya menggunakan endpoint kanonis `/follow`. Kapabilitas pengikut profil diterbitkan melalui penyimpanan gateway dan `ctx` sistem, serta gateway Social melaporkan versi dari manifesnya.

## Commit

- [c9a478c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9a478cfe93519e006eeb6098bc4023d9883b01b)
- [614b5c54](https://github.com/Cognis-Labs-HQ/Cognis/commit/614b5c54)
- [4568d5aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/4568d5aa)
