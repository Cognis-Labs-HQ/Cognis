# Avatar profil yang konsisten

## Satu sumber avatar milik profil

Pemuatan avatar profil, tampilan cadangan, pembuatan inisial, dan warna inisial kini berasal dari kapabilitas CTX UI adaptor Profil. Pemanggil UI bersama mendelegasikan ke kapabilitas tersebut alih-alih memelihara implementasi yang berbeda, sehingga nama menghasilkan avatar yang sama di seluruh aplikasi.

## Pemanggil yang tersisa diaudit

Pesan, Kalender, Jitsi Meet, Nextcloud Whiteboard, Berbagi, tampilan kehadiran, dan avatar kelas kini hanya menjangkau adaptor Profil melalui klien CTX bersama. Ekspor ulang gateway Sosial yang usang telah dihapus, dan pengujian regresi mencegah implementasi inisial baru, pengambilan berkas profil secara langsung, atau impor penyedia lama.
