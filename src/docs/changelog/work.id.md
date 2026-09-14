# Wajibkan Penggunaan Ulang UI
**Cabang Fitur:** work

## Lindungi penyusunan halaman
Cakupan arsitektur otomatis kini menolak halaman inti dan modul eksternal terpasang yang menerbitkan fungsi pemasangan tanpa menggunakan penyusun halaman Cognis.

## Lindungi utilitas pakai ulang
Modul peramban eksternal tidak dapat lagi mendeklarasikan ulang fungsi yang sudah ditawarkan oleh permukaan pakai ulang UI Cognis, dan perenderan langsung ke akar pemasangan dilaporkan bersama penggunaan penyusun yang hilang.


## Lindungi penyusunan formulir
Kode peramban inti dan modul eksternal wajib memakai pembangun formulir Cognis setiap kali menerbitkan formulir atau menangani pengiriman. Pembangun kini mendukung konten kompleks tepercaya dan atribut formulir tervalidasi agar formulir khusus tetap memakai pembungkus bersama.

## Commit
- [57d2cdca](https://github.com/Cognis-Labs-HQ/Cognis/commit/57d2cdca)
- [6ce9fafe](https://github.com/Cognis-Labs-HQ/Cognis/commit/6ce9fafe)
