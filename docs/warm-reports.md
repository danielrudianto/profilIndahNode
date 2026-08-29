# Menghangatkan cache laporan tiap dini hari

Cache laporan yang diisi oleh pengguna PERTAMA berarti selalu ada satu orang
yang membayar ongkosnya — dan di toko, orang itu selalu yang datang paling
pagi. Penjadwal ini memindahkan ongkosnya ke jam yang tidak ada pemiliknya.

Yang dihangatkan: laporan penjualan per merek, tipe, pelanggan, dan sales,
untuk bulan berjalan beserta dua bulan sebelumnya — persis tiga bulan yang
diminta halaman laporan.

`/etc/systemd/system/profil-indah-warm.service`:

```ini
[Unit]
Description=Hangatkan cache laporan Profil Indah
After=network.target mysql.service redis-server.service

[Service]
Type=oneshot
User=deploy
WorkingDirectory=/var/www/profilindah.id/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/startup.js warmReports
StandardOutput=journal
StandardError=journal
```

`/etc/systemd/system/profil-indah-warm.timer`:

```ini
[Unit]
Description=Jalankan penghangat cache laporan tiap dini hari

[Timer]
OnCalendar=*-*-* 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

`Persistent=true` menjalankan pekerjaan yang terlewat ketika mesin mati pada
jam itu — tanpa ia, server yang sempat direstart dini hari melewatkan
penghangatan sampai besoknya, dan tidak ada yang tahu selain halaman yang
terasa lambat pagi itu.

Jam 3 dipilih karena penjadwal stok minimum berjalan Senin dini hari; keduanya
tidak menyentuh tabel yang sama, tetapi memberi jarak membuat log-nya mudah
dibaca ketika salah satu bermasalah.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now profil-indah-warm.timer
systemctl list-timers profil-indah-warm --no-pager
```

Uji sekarang tanpa menunggu dini hari:

```bash
sudo systemctl start profil-indah-warm.service
journalctl -u profil-indah-warm -n 20 --no-pager
```

Tiap baris `hangat — laporan:penjualan-...` berarti satu laporan tersimpan.
