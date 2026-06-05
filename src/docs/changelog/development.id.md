# Pemisahan API Gateway

## Prefiks rute gateway distandardkan

Setiap gateway kini memiliki rute API sendiri di bawah prefiks khusus `/api/v1/<gateway-id>/`. Rute yang sebelumnya tidak mengikuti konvensi ini telah diganti namanya: rute gateway notify dipindahkan dari `/api/v1/notifications/` ke `/api/v1/notify/`, dan rute gateway social dipindahkan dari `/api/v1/profile/`, `/api/v1/messages/`, dan seterusnya ke `/api/v1/social/`.

## Gateway nonaktif memblokir semua rute pada prefiksnya

Saat sebuah gateway dinonaktifkan, setiap permintaan HTTP ke jalur apa pun di bawah prefiks miliknya sekarang mengembalikan respons 503 dengan `gateway_disabled`, bukan jatuh ke 404.

## Modul nonaktif mengembalikan module_disabled

Saat sebuah modul dinonaktifkan, permintaan ke rute yang didaftarkannya sekarang mengembalikan respons 503 dengan `module_disabled`, bukan jatuh ke 404.
