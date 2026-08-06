# Penemuan HTTP reverse proxy yang andal

## Mencegah proxy pengakhir TLS memilih upstream TLS

Image `cognis-web` kini hanya mengiklankan port HTTP-nya untuk penemuan layanan
otomatis. Dengan demikian, Traefik dan proxy pengakhir TLS serupa memilih port
80, bukan tanpa sengaja mengirim HTTP biasa ke port 443 lalu menerima respons
421 Misdirected Request.
