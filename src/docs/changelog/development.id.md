# Pemisahan API Gateway

**Feature Branch:** development

## Prefiks rute gateway distandardkan

Setiap gateway kini memiliki rute API sendiri di bawah prefiks khusus `/api/v1/<gateway-id>/`. Rute yang sebelumnya tidak mengikuti konvensi ini telah diganti namanya: rute gateway notify dipindahkan dari `/api/v1/notifications/` ke `/api/v1/notify/`, dan rute gateway social dipindahkan dari `/api/v1/profile/`, `/api/v1/messages/`, dan seterusnya ke `/api/v1/social/`.

## Gateway nonaktif memblokir semua rute pada prefiksnya

Saat sebuah gateway dinonaktifkan, setiap permintaan HTTP ke jalur apa pun di bawah prefiks miliknya sekarang mengembalikan respons 503 dengan `gateway_disabled`, bukan jatuh ke 404.

## Modul nonaktif mengembalikan module_disabled

Saat sebuah modul dinonaktifkan, permintaan ke rute yang didaftarkannya sekarang mengembalikan respons 503 dengan `module_disabled`, bukan jatuh ke 404.

# Cakupan Logging dan Perbaikan Tangkapan Diam

## Cakupan pengujian logging sisi server diperluas

Kasus uji baru mencakup rute stream logging yang mengembalikan false untuk jalur yang tidak cocok dan metode non-GET, mengirim peristiwa `snapshot_error` saat file log tidak ada, mendeteksi rotasi log melalui pengurangan ukuran file dan mengirim peristiwa `reset`, serta menerapkan filter rentang waktu dalam jam. Tiga pengujian unit logger tambahan mencakup format konsol JSON, perutean `writeConsoleLog` ke stdout versus stderr, dan `createLogEntry` yang dengan benar menghilangkan kolom meta ketika tidak ada nilai yang bermakna.

## Blok tangkapan diam dihapus dari popup crash dan router

Dua handler `catch(() => {})` di `installRuntimeErrorHandlers` sekarang mencatat peringatan alih-alih menelan kesalahan yang terjadi saat membuka popup. Blok catch `readAuthSetupRequirement` di router aplikasi sekarang mencatat kesalahan jaringan yang tertangkap. Tangkapan fetch per-bahasa di `loadStudyChildComponents` sekarang mencatat kode bahasa dan kesalahan sebelum mengembalikan fallback kosong. Tangkapan `startStream` di bagian log admin sekarang mencatat kegagalan koneksi, dan tangkapan peristiwa SSE yang salah bentuk mencatat kesalahan parse alih-alih membuangnya secara diam.

## Commits

- [c2dd07a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2dd07a630b453a51f9793ab2855ab96150b058c)
