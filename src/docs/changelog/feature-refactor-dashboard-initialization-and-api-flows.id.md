# Dashboard Lebih Cepat

## Kartu dashboard dimuat secara independen

Dashboard menyelesaikan pemasangan segera setelah tata letak dasar dirender, sementara detail akun, acara mendatang, dan ekstensi tetap dimuat secara independen sehingga integrasi opsional tidak dapat menghambat navigasi.

## Acara mendatang memakai satu permintaan terbatas

Flow gateway kalender kini memproyeksikan acara kalender yang dapat diakses dan undangan melalui satu endpoint terautentikasi dengan batas hasil yang diminta pemanggil.

## Permintaan kalender tetap berada di Gateway Kalender

Dashboard menggunakan fungsi acara mendatang yang diekspor Gateway Kalender sehingga detail endpoint dan respons tetap berada dalam komponen pemiliknya.

## Pelaporan versi autentikasi konsisten

Pendaftaran runtime autentikasi kini melaporkan versi yang sama dengan manifes komponennya.
