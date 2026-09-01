# Perubahan keanggotaan sosial yang konsisten

## API dan kapabilitas keanggotaan yang sederhana

Anggota ruang obrolan dan pengikut profil kini memakai konvensi koleksi `POST`/`DELETE` yang terdokumentasi serta kapabilitas `ctx` yang sepadan untuk integrasi komponen tepercaya.

## Kapabilitas keanggotaan diekspor ke modul

Adaptor Messages kini menerbitkan keanggotaan ruang obrolan melalui `ctx` sistem dan penyimpanan kapabilitas gateway, sehingga modul eksternal seperti Jitsi Meet dapat menemukannya saat pengaktifan dan bootstrap.

## Commit

- [a8b044c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a8b044c024072a91dc63741698588d762418d0b3)
