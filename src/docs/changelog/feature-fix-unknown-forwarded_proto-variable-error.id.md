# Startup nginx yang Andal

## Lindungi Variabel nginx

Kontainer web kini membatasi substitusi templat pada host upstream Cognis dan menggunakan variabel penerusan dengan namespace Cognis. Permintaan melalui proksi yang mengakhiri TLS tetap memakai HTTPS, sedangkan permintaan langsung tanpa protokol penerusan kembali dengan aman ke skema koneksi nginx.
