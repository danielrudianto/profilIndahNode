# Pasang V20 di server

Runbook dari VM kosong sampai aplikasi melayani pengguna. Ditulis untuk
**Ubuntu Server 24.04 LTS (noble)**.

> **Kenapa bukan Debian.** Percobaan pertama memakai Debian 13 (trixie) dan
> mentok di MySQL: pemasang repositori Oracle menolak trixie mentah-mentah,
> dan repositori bawaan Debian hanya menyediakan MariaDB — yang tidak resmi
> didukung provider `mysql` milik Prisma. Jalan keluarnya ada (container, atau
> memaksa paket bookworm), tetapi semuanya menambah bagian yang bisa rusak
> demi basis data toko yang justru paling tidak boleh rusak. Ubuntu
> menyediakan MySQL 8 di repositori bawaannya, jadi seluruh persoalan itu
> hilang dengan satu perintah `apt`.

**Kata bertuliskan HURUF_BESAR di seluruh dokumen ini adalah tempat isian,
bukan nilai yang boleh disalin apa adanya** — `SANDI_YANG_KUAT`,
`ALAMAT_SERVER`, `GIT_REPO_BACKEND`, dan sejenisnya.

Yang akan berjalan di mesin ini:

| Komponen | Peran | Port |
|---|---|---|
| Node (API) | backend Express, `dist/app.js` | 5000 (lokal saja) |
| Node (worker) | BullMQ — notifikasi, HPP, stok minimum mingguan | — |
| MySQL 8 | seluruh data | 3306 (lokal saja) |
| Redis 7 | antrean BullMQ + singgahan | 6379 (lokal saja) |
| Meilisearch 1.x | pencarian barang & supplier | 7700 (lokal saja) |
| nginx | menyajikan frontend + TLS + reverse proxy | 80, 443 |

Hanya nginx yang menghadap internet. Sisanya mendengar di `127.0.0.1`.

---

## Bagian 0 — Keadaan repo sebelum menyentuh server

Alamat yang dipakai V20:

| Bagian | Domain |
|---|---|
| Frontend | `https://v20.profilindah.id` |
| API | `https://v20.service.profilindah.id` |

**0.1 — CORS: sudah disetel.** `src/constants/allowed-origin.constant.ts`
kini memuat `https://v20.profilindah.id`. Kalau suatu saat domainnya berubah,
daftar ini yang harus ikut berubah — tanpa itu seluruh permintaan dari
peramban ditolak, dan yang terlihat pengguna hanyalah halaman gagal memuat
tanpa sebab jelas.

**0.2 — Alamat API frontend: sudah disetel.**
`src/environments/environment.ts` (repo frontend) kini berisi
`url: 'https://v20.service.profilindah.id/'` — dulu menunjuk sandbox.
**Garis miring di ujung wajib**: `ApiService` merangkai alamat dengan
`environment.url + rute`, jadi tanpa itu jadinya `...idproduct-stock`.

Pastikan `ng build` dijalankan dari commit yang sudah memuat keduanya.

**0.3 — Node 22, bukan 20.**
Mesin pengembangan memakai Node 20.19.5, tetapi Node 20 sudah tidak menerima
perbaikan keamanan sejak April 2026. Server yang menghadap internet sebaiknya
memakai **Node 22 LTS**. Uji dulu di lokal sebelum menyiapkan server:

```bash
nvm install 22 && nvm use 22 && rm -rf node_modules && npm ci && npm test
```

Kalau ada yang gagal, tetap di Node 20 untuk sekarang dan catat sebagai utang.

---

## Bagian 1 — Dasar sistem

Masuk sebagai root pertama kali, lalu buat pengguna kerja.

```bash
apt update && apt upgrade -y
adduser deploy
usermod -aG sudo deploy
```

Salin kunci SSH dari mesin lokal. **Semua perintah blok ini dijalankan di
laptop**, bukan di server.

Kalau `~/.ssh` belum berisi `id_ed25519.pub`, kuncinya memang belum pernah
dibuat — `ssh-copy-id` akan menjawab `ERROR: No identities found`. Buat dulu:

```bash
ssh-keygen -t ed25519 -C "daniel@jarvis"
```

Terima lokasi bawaannya, dan **isi passphrase**: kunci ini satu-satunya jalan
masuk ke server produksi, jadi jangan sampai berguna begitu saja bagi siapa
pun yang memegang laptopnya. Supaya tidak mengetiknya berulang kali:

```bash
ssh-add ~/.ssh/id_ed25519
```

Baru salin ke server:

```bash
ssh-copy-id deploy@ALAMAT_SERVER
```

> **Kalau sistem operasinya baru dipasang ulang di IP yang sama**, SSH akan
> menolak dengan `REMOTE HOST IDENTIFICATION HAS CHANGED` — sidik jari mesin
> lama masih tersimpan. Buang entri lamanya lebih dulu:
> `ssh-keygen -R ALAMAT_SERVER`

> Pengguna `deploy` harus sudah ada di server (dua perintah `adduser` di atas).
> Kalau belum, `ssh-copy-id` menjawab `Permission denied` — masuk sebagai root
> dulu, buat penggunanya, baru ulangi.

**Pastikan `ssh deploy@ALAMAT_SERVER` benar-benar berhasil tanpa sandi**
sebelum melanjutkan. Langkah berikutnya mematikan login bersandi; menjalankannya
sebelum kunci terbukti bekerja akan mengunci lu di luar server sendiri.

```bash
sudo sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

**Zona waktu harus WITA.** Penjadwal stok minimum berjalan Senin dini hari
waktu Makassar, dan seluruh tanggal dokumen dibuat memakai jam server —
membiarkannya UTC membuat laporan harian bergeser delapan jam.

```bash
sudo timedatectl set-timezone Asia/Makassar
timedatectl   # pastikan tertulis WITA
```

Tembok api dan perkakas dasar:

```bash
sudo apt install -y ufw fail2ban curl git unattended-upgrades
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

---

## Bagian 2 — Node 22

Ubuntu 24.04 memaketkan Node 18; untuk Node 22 pakai repositori NodeSource.

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs build-essential
node --version && npm --version
```

`build-essential` diperlukan karena beberapa dependensi masih dikompilasi saat
pemasangan.

---

## Bagian 3 — MySQL 8

Ubuntu menyediakan MySQL 8 di repositori bawaannya — tidak perlu repositori
pihak ketiga.

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Pastikan hanya mendengar dari mesin sendiri (bawaan Ubuntu sudah begitu;
perintah ini menegaskannya):

```bash
echo -e "[mysqld]\nbind-address = 127.0.0.1" | sudo tee /etc/mysql/mysql.conf.d/zz-local.cnf
sudo systemctl restart mysql
```

Buat sandi penggunanya lebih dulu, lalu simpan di tempat aman — ia akan
dipakai lagi pada `DATABASE_URL` di Bagian 6:

```bash
openssl rand -hex 24
```

`-hex`, bukan `-base64`: hasilnya hanya angka dan huruf. Sandi ini menjadi
bagian dari URL koneksi, dan karakter seperti `@`, `/`, atau `:` di dalamnya
membuat Prisma salah membaca alamatnya.

Buat basis data dan penggunanya:

```bash
sudo mysql
```

```sql
CREATE DATABASE profil_indah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'profilindah'@'localhost' IDENTIFIED BY 'SANDI_HASIL_OPENSSL_TADI';
GRANT ALL PRIVILEGES ON profil_indah.* TO 'profilindah'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Telanjur menyalin sandi contohnya apa adanya? Belum ada yang bergantung
padanya sejauh ini — ganti saja:

```sql
ALTER USER 'profilindah'@'localhost' IDENTIFIED BY 'SANDI_BARU'; FLUSH PRIVILEGES;
```

Prompt MySQL menyimpan setiap baris yang diketik, termasuk sandi; setelah
selesai, `rm -f ~/.mysql_history`.

Zona waktu MySQL tidak perlu disetel khusus: seluruh kueri bertanggal di
repositori ini menerima tanggalnya dari aplikasi — `dashboard.repository.ts`
bahkan mencatat alasannya — jadi tidak ada yang bergantung pada `CURDATE()`
milik MySQL.

---

## Bagian 4 — Redis

```bash
sudo apt install -y redis-server
```

Sunting `/etc/redis/redis.conf`:

```
bind 127.0.0.1 -::1
requirepass SANDI_REDIS_YANG_KUAT
maxmemory-policy noeviction
```

`noeviction` **wajib**. BullMQ menyimpan antrean pekerjaannya di Redis; dengan
kebijakan pembuangan seperti `allkeys-lru`, pekerjaan yang menunggu bisa
dihapus diam-diam ketika memori penuh — antrean HPP dan stok minimum hilang
tanpa satu pun galat.

```bash
sudo systemctl restart redis-server
redis-cli -a SANDI_REDIS_YANG_KUAT ping   # harus PONG
```

---

## Bagian 5 — Meilisearch

```bash
curl -fsSL https://apt.meilisearch.com/meilisearch-keyring.asc \
  | sudo tee /usr/share/keyrings/meilisearch-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/meilisearch-keyring.asc] https://apt.meilisearch.com/ stable main" \
  | sudo tee /etc/apt/sources.list.d/meilisearch.list
sudo apt update && sudo apt install -y meilisearch
meilisearch --version
```

Pengembangan memakai 1.5.0; versi 1.x mana pun seharusnya cocok dengan klien
`meilisearch@0.60`. Setelah indeks dibuat nanti (Bagian 9), buka halaman
Barang untuk memastikan.

Buat pengguna sistem, folder data, dan berkas konfigurasinya:

```bash
sudo useradd -d /var/lib/meilisearch -s /bin/false -b /var/lib -m -r meilisearch
sudo chown -R meilisearch:meilisearch /var/lib/meilisearch
openssl rand -base64 48    # simpan hasilnya sebagai MASTER KEY
```

`/etc/meilisearch.toml`:

```toml
env = "production"
master_key = "KUNCI_HASIL_OPENSSL_TADI"
db_path = "/var/lib/meilisearch/data"
dump_dir = "/var/lib/meilisearch/dumps"
http_addr = "127.0.0.1:7700"
```

`/etc/systemd/system/meilisearch.service`:

```ini
[Unit]
Description=Meilisearch
After=network.target

[Service]
User=meilisearch
Group=meilisearch
ExecStart=/usr/bin/meilisearch --config-file-path /etc/meilisearch.toml
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo chmod 600 /etc/meilisearch.toml
sudo systemctl daemon-reload
sudo systemctl enable --now meilisearch
curl http://127.0.0.1:7700/health   # {"status":"available"}
```

---

## Bagian 6 — Backend

```bash
sudo mkdir -p /srv/profil-indah && sudo chown deploy:deploy /srv/profil-indah
cd /srv/profil-indah
git clone GIT_REPO_BACKEND api && cd api
npm ci
```

Buat `/srv/profil-indah/api/.env.production` (rujuk `.env.example` untuk
keterangan tiap baris). Namanya **bukan** `.env`: aplikasi memilih berkas
menurut `NODE_ENV` lewat `src/utils/env.helper.ts`.

```bash
DATABASE_URL="mysql://profilindah:SANDI_YANG_KUAT@localhost:3306/profil_indah"
TOKEN_KEY="$(openssl rand -hex 48)"
REFRESH_TOKEN_KEY="$(openssl rand -hex 48)"
EXPIRATION="1h"
REFRESH_EXPIRATION="7d"
MEILISEARCH_HOST="http://127.0.0.1:7700"
MEILISEARCH_MASTER_KEY="KUNCI_MEILISEARCH_TADI"
REDIS_URL="redis://:SANDI_REDIS_YANG_KUAT@127.0.0.1:6379"
LIMIT="10"
MIN_STOCK_WINDOW_DAYS="30"
MIN_STOCK_LEAD_DAYS="7"
MIN_STOCK_SERVICE_Z="1.65"
PORT="5000"
```

> `TOKEN_KEY` dan `REFRESH_TOKEN_KEY` **harus baru**, bukan salinan dari
> server lama. Keduanya menandatangani token sesi; membocorkan atau memakai
> ulang berarti token lama tetap sah di sistem baru.

```bash
chmod 600 .env.production
ln -s .env.production .env
```

Tautan `.env` itu bukan hiasan: Prisma CLI hanya mengenal nama `.env`, jadi
tanpanya `prisma migrate deploy` di Bagian 9 akan menembak basis data yang
berbeda dari yang dipakai aplikasi — atau berhenti karena `DATABASE_URL`
tidak ditemukan.

```bash
npx prisma generate
npm run build          # menghasilkan dist/
```

---

## Bagian 7 — Dua layanan systemd

API — `/etc/systemd/system/profil-indah-api.service`:

```ini
[Unit]
Description=Profil Indah API
After=network.target mysql.service redis-server.service meilisearch.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/srv/profil-indah/api
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Worker — `/etc/systemd/system/profil-indah-worker.service`: **sama persis**,
kecuali `Description=Profil Indah Worker` dan
`ExecStart=/usr/bin/node dist/worker.js`.

`Environment=NODE_ENV=production` sudah cukup — aplikasi membaca
`.env.production` sendiri. Menyuruh systemd ikut memuat berkasnya lewat
`EnvironmentFile` justru menambah satu pengurai lagi yang aturan tanda
kutipnya berbeda dari dotenv.

Worker bukan pelengkap: dialah yang memproses antrean HPP, kartu stok, dan
menjalankan perhitungan stok minimum tiap Senin dini hari. Tanpa worker,
pekerjaan menumpuk di Redis tanpa ada yang mengerjakan.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now profil-indah-api profil-indah-worker
sudo systemctl status profil-indah-api --no-pager
```

---

## Bagian 8 — Frontend dan nginx

Bangun frontend **di laptop** (server tidak perlu Angular), lalu kirim
hasilnya. Perhatikan akhiran `browser/` — Angular 20 menaruh berkas siap
sajinya di sana.

```bash
cd ~/Profil-Indah-16
ng build
rsync -avz --delete dist/profil-indah-16/browser/ \
  deploy@ALAMAT_SERVER:/srv/profil-indah/web/
```

```bash
sudo apt install -y nginx
```

`/etc/nginx/sites-available/profil-indah`:

```nginx
# Frontend
server {
    listen 80;
    server_name v20.profilindah.id;
    root /srv/profil-indah/web;
    index index.html;

    # Rute Angular ditangani di peramban; tanpa baris ini, menyegarkan
    # halaman di /Stock-check menghasilkan 404 dari nginx.
    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}

# API
server {
    listen 80;
    server_name v20.service.profilindah.id;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;      # socket.io
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;                      # unduhan laporan besar
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/profil-indah /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Sertifikat (arahkan DNS kedua domain ke server ini lebih dulu):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d v20.profilindah.id -d v20.service.profilindah.id
```

---

## Bagian 9 — Data dan pekerjaan sekali jalan

Urutan ini penting. Perintah CLI dijalankan dari `dist/`, bukan `ts-node`.

**9.1 — Pindahkan data dari server lama.** Di server lama:

```bash
mysqldump -u USER -p --single-transaction --routines NAMA_DB_LAMA | gzip > v19.sql.gz
```

Di server baru:

```bash
gunzip < v19.sql.gz | mysql -u profilindah -p profil_indah
```

**9.2 — Terapkan migrasi.** Membawa `sales_invoice_rebate` dan
`minimum_stock_recommendation`.

```bash
cd /srv/profil-indah/api && npx prisma migrate deploy
```

**9.3 — Indeks tuning.** `docs/index-tuning.sql` BAGIAN 1–6, jalankan
**satu bagian demi satu bagian**, jangan sekaligus.

**9.4 — Bangun indeks pencarian.**

```bash
node dist/setup/meilisearch.setup.js   # atau: npx ts-node src/setup/meilisearch.setup.ts
node dist/startup.js syncProduct
node dist/startup.js syncProductPackage
```

**9.5 — Pekerjaan sekali jalan** (yang berat sebaiknya saat toko tutup):

```bash
node dist/startup.js settleRoundedReceivables
node dist/startup.js rebuildStockIn          # berat, saat downtime
node dist/startup.js calculateMinimumStock   # selanjutnya otomatis tiap Senin
```

**9.6 — Rapikan data kembar.** Tipe barang `LIGHTING` dan `"jasa "` (perhatikan
spasi di ujungnya) masing-masing punya dua baris. Penjaga baru mencegah kembar
*baru*, tidak membersihkan yang lama. Periksa dulu:

```sql
SELECT name, COUNT(*) FROM product_type WHERE is_delete = 0
GROUP BY name HAVING COUNT(*) > 1;
SELECT name, COUNT(*) FROM product_brand WHERE is_delete = 0
GROUP BY name HAVING COUNT(*) > 1;
```

Untuk tiap pasangan: pindahkan `product.product_type_id` ke baris yang
dipertahankan, lalu tandai baris kosongnya terhapus.

---

## Bagian 10 — Verifikasi

```bash
systemctl is-active profil-indah-api profil-indah-worker mysql redis-server meilisearch nginx
curl -I https://v20.profilindah.id
curl -i https://v20.service.profilindah.id/     # 404 pun tak apa: artinya hidup
sudo journalctl -u profil-indah-api -n 50 --no-pager
sudo journalctl -u profil-indah-worker -n 50 --no-pager
```

Uji asap resmi, dijalankan dari laptop dengan akun uji (**jangan** akun
pemilik):

```bash
node scripts/smoke-test.js --url https://v20.service.profilindah.id --user AKUN_UJI --pass SANDI
```

Lalu periksa dengan mata di peramban: masuk, buka **Barang** (membuktikan
Meilisearch hidup), **Laporan → Barang kurang** (membuktikan rekomendasi stok
terisi), buat satu faktur uji, dan pastikan penyegaran halaman di rute dalam
seperti `/Stock-check` tidak menghasilkan 404.

---

## Bagian 11 — Cadangan

Toko ini kehilangan uang kalau datanya hilang. Pasang sebelum hari pertama,
bukan sesudah.

`/usr/local/bin/backup-profil-indah.sh`:

```bash
#!/bin/bash
set -euo pipefail
TUJUAN=/var/backups/profil-indah
mkdir -p "$TUJUAN"
STEMPEL=$(date +%F-%H%M)
mysqldump -u profilindah -pSANDI --single-transaction --routines profil_indah \
  | gzip > "$TUJUAN/db-$STEMPEL.sql.gz"
find "$TUJUAN" -name 'db-*.sql.gz' -mtime +14 -delete
```

```bash
sudo chmod 700 /usr/local/bin/backup-profil-indah.sh
sudo crontab -e
# 0 1 * * *  /usr/local/bin/backup-profil-indah.sh
```

Salinan yang hanya ada di mesin yang sama bukan cadangan. Kirim berkasnya ke
luar server — penyimpanan objek, mesin lain, atau unduh terjadwal.

Meilisearch tidak perlu dicadangkan: indeksnya bisa dibangun ulang kapan saja
dari MySQL lewat langkah 9.4.

---

## Lampiran — Yang paling sering terlupa

1. `ng build` dijalankan dari commit lama — frontend jadinya masih menembak
   sandbox, atau domainnya belum ada di daftar CORS (Bagian 0).
2. Garis miring di ujung `environment.url` terhapus (Bagian 0.2).
3. Zona waktu server bukan `Asia/Makassar` (Bagian 1).
4. `maxmemory-policy` Redis bukan `noeviction` (Bagian 4).
5. Worker tidak dinyalakan — semuanya tampak baik sampai antrean menumpuk
   dan stok minimum tidak pernah diperbarui (Bagian 7).
6. `try_files ... /index.html` tidak ada di nginx — aplikasi jalan sampai
   pengguna pertama menekan F5 di halaman dalam (Bagian 8).
7. Indeks Meilisearch belum dibangun — halaman Barang dan Stok menjawab 500
   padahal basis datanya sehat (Bagian 9.4).
