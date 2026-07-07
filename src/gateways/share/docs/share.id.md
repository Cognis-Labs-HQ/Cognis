# Share Gateway

## Ikhtisar

Gateway Share memiliki token bagikan publik untuk sumber daya Cognis. Gateway ini membuat, menampilkan, mencabut, dan menyelesaikan tautan bagikan melalui flow `ctx` kanonis sehingga gateway dan modul pemilik sumber daya dapat ikut tanpa mengimpor internal share.

## Halaman Share

Sumber daya bersama dibuka di `/share/:token`. Halaman ini memakai page composer standar dengan shell minimal, header bermerek Cognis, dan renderer yang dipilih oleh komponen pemilik.
