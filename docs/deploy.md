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

Keduanya sudah terdorong ke branch yang akan di-`git clone` pada Bagian 8,
jadi tidak ada langkah tambahan — cukup pastikan `git pull` di server benar
membawa commit tersebut sebelum membangun.

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
sudo apt install -y ufw fail2ban curl git rsync unattended-upgrades
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
echo "Pi20-$(openssl rand -hex 20)"
```

Bentuknya tampak aneh, dan itu disengaja — ia harus memuaskan dua aturan yang
saling menarik ke arah berlawanan:

- `mysql_secure_installation` menyalakan **validate_password** tingkat MEDIUM,
  yang menuntut huruf besar, huruf kecil, angka, **dan** karakter khusus.
  Sandi hex polos ditolak dengan `ERROR 1819 (HY000): Your password does not
  satisfy the current policy requirements`.
- Sandi ini menjadi bagian dari URL koneksi Prisma, sehingga `@`, `:`, `/`,
  atau `#` di dalamnya membuat alamatnya salah dibaca — dan galatnya berbunyi
  "can't reach database server", sama sekali tidak menyebut sandi.

Awalan `Pi20-` memenuhi tuntutan pertama dengan karakter yang aman bagi
tuntutan kedua; empat puluh digit hex di belakangnya yang membuatnya acak.

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

**Periksa plugin autentikasinya.** Prisma hanya memahami
`caching_sha2_password` dan `mysql_native_password`; bila penggunanya lahir
dengan `sha256_password`, `mysql` di terminal tetap bisa masuk sementara
aplikasi gagal dengan `Unknown authentication plugin 'sha256_password'` —
galat yang muncul jauh belakangan, saat layanan pertama kali dinyalakan.

```bash
sudo mysql -e "SELECT user, host, plugin FROM mysql.user WHERE user='profilindah';"
```

Bila bukan `caching_sha2_password`, pindahkan tanpa mengubah sandinya:

```sql
ALTER USER 'profilindah'@'localhost' IDENTIFIED WITH caching_sha2_password BY 'SANDI_YANG_SAMA';
FLUSH PRIVILEGES;
```

Telanjur menyalin sandi contohnya apa adanya? Belum ada yang bergantung
padanya sejauh ini — ganti saja:

```sql
ALTER USER 'profilindah'@'localhost' IDENTIFIED BY 'SANDI_BARU'; FLUSH PRIVILEGES;
```

Prompt MySQL menyimpan setiap baris yang diketik, termasuk sandi; setelah
selesai, `rm -f ~/.mysql_history`.

**Naikkan memori kerjanya.** Bawaan `innodb_buffer_pool_size` adalah 128 MB —
angka dari zaman server bersama, dan jauh lebih kecil daripada basis data toko
ini (sekitar 1 GB setelah data lama diimpor). Akibatnya setiap laporan berat
menggusur isi singgahan, dan permintaan berikutnya harus membacanya ulang dari
diska. Gejalanya: aplikasi terasa lambat padahal seluruh indeks sudah terpasang.

```bash
printf '[mysqld]\ninnodb_buffer_pool_size = 3G\ninnodb_io_capacity = 1000\ninnodb_io_capacity_max = 2000\ninnodb_flush_neighbors = 0\n' | sudo tee /etc/mysql/mysql.conf.d/zz-tuning.cnf
sudo systemctl restart mysql
```

Tiga giga dipilih dari 8 GB milik mesin ini, bukan dari rumus umum: sisanya
harus cukup untuk Node, Meilisearch, dan sesekali build Angular yang sendirian
meminta 2 GB. `io_capacity` dinaikkan karena bawaannya mengasumsikan cakram
berputar, sedangkan mesin ini memakai SSD.

`innodb_flush_log_at_trx_commit` **sengaja dibiarkan pada 1**. Menurunkannya ke
2 memang mempercepat penulisan, tetapi berarti transaksi satu detik terakhir
dapat hilang ketika listrik mati — pertukaran yang tidak layak untuk data uang.

> Sesudah restart, singgahannya kosong. Beri waktu memanas sebelum menilai
> kecepatannya; `performance_schema` juga mulai menghitung dari nol lagi.

**Sediakan swap.** Mesin ini datang tanpa swap sama sekali, dan itu berbahaya
bukan karena lambat melainkan karena mematikan: ketika memori habis, kernel
membunuh proses ber-RSS terbesar — biasanya `mysqld`. Build Angular yang
meminta 2 GB sudah cukup untuk memicunya.

```bash
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

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

Ambil binernya langsung dari GitHub Releases. Repositori apt mereka
(`apt.meilisearch.com`) pernah gagal diselesaikan DNS — *No address associated
with hostname* — dan satu berkas biner tidak menambah sumber paket yang bisa
mati diam-diam.

```bash
sudo curl -fsSL -o /usr/local/bin/meilisearch \
  https://github.com/meilisearch/meilisearch/releases/download/v1.5.0/meilisearch-linux-amd64
sudo chmod +x /usr/local/bin/meilisearch
meilisearch --version
```

Versinya dipatok **v1.5.0**, sama persis dengan mesin pengembangan, supaya
tidak ada kejutan terhadap klien `meilisearch@0.60`. Ia hanya mendengar di
`127.0.0.1` dan tidak pernah menghadap internet. Untuk menaikkannya kelak,
ganti nomor versi di perintah di atas, jalankan ulang, lalu
`sudo systemctl restart meilisearch` — indeksnya bisa dibangun ulang kapan
saja lewat Bagian 9.4, jadi langkah ini murah.

Setelah indeks dibuat nanti (Bagian 9), buka halaman Barang untuk memastikan
klien dan servernya benar-benar cocok.

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
ExecStart=/usr/local/bin/meilisearch --config-file-path /etc/meilisearch.toml
Restart=always

[Install]
WantedBy=multi-user.target
```

Berkas konfigurasi memuat master key, jadi jangan bisa dibaca sembarang
pengguna — tetapi **layanan ini berjalan sebagai `meilisearch`, bukan root**.
`chmod 600` saja membuat prosesnya sendiri tidak bisa membaca konfigurasinya
dan layanan gagal menyala. Beri kepemilikan grupnya:

```bash
sudo chown root:meilisearch /etc/meilisearch.toml
sudo chmod 640 /etc/meilisearch.toml
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now meilisearch
curl http://127.0.0.1:7700/health   # {"status":"available"}
```

Kalau `curl` menjawab *Couldn't connect*, prosesnya tidak hidup — lihat
sebabnya, jangan menebak:

```bash
systemctl status meilisearch --no-pager -l; journalctl -u meilisearch -n 20 --no-pager
```

Dua penyebab yang paling sering muncul di langkah ini:

| Gejala di log | Sebab |
|---|---|
| `status=203/EXEC` | `ExecStart` menunjuk jalur yang salah — binernya di `/usr/local/bin/meilisearch` |
| `Permission denied` pada `/etc/meilisearch.toml` | izin berkas belum diperbaiki seperti di atas |

---

## Bagian 6 — Backend

Seluruh berkas aplikasi tinggal di bawah satu akar, dinamai menurut
domainnya:

```
/var/www/profilindah.id/
├── backend/       repositori backend — dijalankan systemd
├── frontend-src/  repositori frontend — tempat ng build dijalankan
└── frontend/      hasil build — inilah yang disajikan nginx
```

`frontend-src` dan `frontend` sengaja terpisah: yang disajikan nginx hanya
berkas jadi, sehingga kode sumber, `node_modules`, dan riwayat git tidak
pernah berada di dalam akar dokumen web.

**Sebutkan branch-nya.** `git clone` tanpa `-b` mendarat di `main`, dan
`main` masih memuat kode lama — Prisma 4, Express 4. Aplikasinya tetap
terpasang dan berjalan, jadi kekeliruan ini tidak berteriak; yang terlihat
hanyalah versi Prisma yang aneh pada keluaran `prisma generate`.

```bash
sudo mkdir -p /var/www/profilindah.id
sudo chown deploy:deploy /var/www/profilindah.id
cd /var/www/profilindah.id
git clone -b BRANCH_BACKEND GIT_REPO_BACKEND backend && cd backend
npm ci
```

Pastikan yang terpasang memang V20 sebelum melanjutkan — Prisma harus 6.x:

```bash
git branch --show-current && ./node_modules/.bin/prisma --version | head -1
```

Buat `/var/www/profilindah.id/backend/.env` (rujuk `.env.example` untuk
keterangan tiap baris). Mesin ini hanya pernah menjalankan produksi, jadi satu
berkas sudah cukup — `src/utils/env.helper.ts` membaca `.env` sebagai cadangan
ketika `.env.production` tidak ada, dan Prisma CLI pun langsung menemukannya
tanpa tautan apa pun.

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
chmod 600 .env
```

```bash
./node_modules/.bin/prisma generate
npm run build          # menghasilkan dist/
```

> **Jangan `npx prisma`, dan jangan menjalankannya sebelum `npm ci`.** Bila
> paketnya belum terpasang, `npx` tidak berhenti — ia mengunduh versi
> **terbaru** dari internet dan menjalankan itu. Proyek ini masih di Prisma 6,
> sedangkan Prisma 7 menolak `url = env("DATABASE_URL")` di dalam skema, dan
> galatnya menuding skemanya: *"The datasource property `url` is no longer
> supported"*. Skemanya benar; yang keliru versi CLI yang kebetulan terunduh.

---

## Bagian 7 — Dua layanan systemd

Ditulis langsung, bukan disalin ke dalam penyunting: nama berkas dan nama
yang dipanggil `systemctl` harus sama persis, dan satu kata meleset —
`profil-indah-api-worker` alih-alih `profil-indah-worker` — membuat
`enable --now` membatalkan **kedua** unit sekaligus, termasuk yang sudah
benar. Gejalanya membingungkan: API ikut mati dan jurnalnya kosong.

```bash
sudo tee /etc/systemd/system/profil-indah-api.service > /dev/null <<'EOF'
[Unit]
Description=Profil Indah API
After=network.target mysql.service redis-server.service meilisearch.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/profilindah.id/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/app.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

```bash
sudo tee /etc/systemd/system/profil-indah-worker.service > /dev/null <<'EOF'
[Unit]
Description=Profil Indah Worker
After=network.target mysql.service redis-server.service meilisearch.service

[Service]
Type=simple
User=deploy
WorkingDirectory=/var/www/profilindah.id/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/worker.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF
```

Worker bukan pelengkap: dialah yang memproses antrean HPP, kartu stok, dan
menjalankan perhitungan stok minimum tiap Senin dini hari. Tanpa worker,
pekerjaan menumpuk di Redis tanpa ada yang mengerjakan.

`NODE_ENV=production` tetap disetel meski berkas lingkungannya cuma satu:
Express memakainya untuk mematikan keluaran galat yang bertele-tele, dan
pustaka lain ikut membacanya. Menyuruh systemd memuat berkasnya lewat
`EnvironmentFile` justru menambah satu pengurai lagi yang aturan tanda
kutipnya berbeda dari dotenv — aplikasi sudah membacanya sendiri.

**Pastikan pengguna `deploy` benar-benar ada** sebelum menyalakan apa pun —
kedua unit menjalankan prosesnya sebagai pengguna itu:

```bash
id deploy || sudo adduser --system --group --no-create-home --shell /usr/sbin/nologin deploy
```

`--system` membuatnya **tidak bisa login sama sekali** — dan itu memang yang
diinginkan bila administrasi server dikerjakan sebagai root lewat terminal
panel penyedia. `deploy` di sini bukan akun untuk masuk, melainkan identitas
yang menjalankan prosesnya, supaya aplikasi yang menghadap internet tidak
berhak penuh atas seluruh mesin. (Bila lu memang ingin masuk SSH dengan akun
itu, pakai `sudo adduser --disabled-password --gecos "" deploy` sebagai
gantinya, lalu salin `authorized_keys` ke dalamnya.)

Bila belum ada, systemd gagal dengan `status=217/USER` dan
`Failed to determine user credentials` — sepasang pesan yang sama sekali tidak
menyebut bahwa penggunanya-lah yang tidak ada. Layanannya lalu dicoba ulang
tiap lima detik tanpa henti.

**Bila langkah-langkah tadi dikerjakan sebagai root, kembalikan dulu
kepemilikannya.** Layanan ini berjalan sebagai `deploy`; berkas milik root —
terutama `.env` yang ber-mode 600 — tidak dapat dibacanya, dan layanannya mati
tanpa menyebut berkas mana yang ditolak.

```bash
sudo chown -R deploy:deploy /var/www/profilindah.id
```

Setelah kepemilikannya berpindah, perintah `git` yang dijalankan root akan
ditolak dengan *detected dubious ownership*. Daftarkan kedua repo sebagai
pengecualian — `scripts/deploy.sh` melakukannya sendiri, tetapi perintah git
manual tetap memerlukannya:

```bash
sudo git config --global --add safe.directory /var/www/profilindah.id/backend
sudo git config --global --add safe.directory /var/www/profilindah.id/frontend-src
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now profil-indah-api profil-indah-worker
sleep 3 && systemctl is-active profil-indah-api profil-indah-worker
```

Bila layanannya sempat gagal berkali-kali sebelum sebabnya diperbaiki,
nolkan dulu penghitungnya — tanpa itu systemd menolak mencoba lagi:

```bash
sudo systemctl reset-failed profil-indah-api profil-indah-worker
sudo systemctl restart profil-indah-api profil-indah-worker
```

Bila salah satunya tidak menyala, bacalah sebabnya:

```bash
sudo journalctl -u profil-indah-api -n 30 --no-pager
```

| Gejala | Sebab |
|---|---|
| `status=217/USER`, `Failed to determine user credentials` | pengguna `deploy` belum dibuat |
| `detected dubious ownership in repository` | git dijalankan root pada repo milik `deploy` — daftarkan pengecualiannya (di bawah) |
| `Unit file ... does not exist` | nama berkas tidak sama dengan yang dipanggil |
| jurnal kosong, status `inactive (dead)` | unitnya belum pernah benar-benar dinyalakan |
| `EACCES` atau `permission denied` pada `.env` | berkas masih milik root (perintah `chown` di atas) |
| `Unknown authentication plugin 'sha256_password'` | pengguna MySQL memakai plugin yang tidak dipahami Prisma (Bagian 3) |
| `Environment variable not found: DATABASE_URL` | `.env` tidak terbaca, atau berada di folder lain |
| `Cannot find module '.../dist/app.js'` | `npm run build` belum dijalankan |

---

## Bagian 8 — Frontend dan nginx

Frontend dibangun **di server**, dari repositorinya sendiri:

```bash
cd /var/www/profilindah.id
git clone -b BRANCH_FRONTEND GIT_REPO_FRONTEND frontend-src && cd frontend-src
git branch --show-current      # pastikan bukan main
npm ci
npm run build
```

Hasilnya mendarat di `dist/profil-indah-16/browser/` — perhatikan akhiran
`browser/`, Angular 20 menaruh berkas siap sajinya satu tingkat lebih dalam.
Salin isinya ke folder yang disajikan nginx:

```bash
mkdir -p /var/www/profilindah.id/frontend
rsync -a --delete dist/profil-indah-16/browser/ /var/www/profilindah.id/frontend/
```

`--delete` membuang berkas terbitan lama; tanpa itu, potongan JavaScript
bernama-hash dari build sebelumnya menumpuk selamanya.

> **Kalau `npm run build` mati terbunuh tanpa pesan**, itu kehabisan memori —
> membangun Angular butuh sekitar 2 GB. Tambahkan swap sementara:
> `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
> Atau bangun di laptop lalu kirim hasilnya:
> `rsync -avz --delete dist/profil-indah-16/browser/ deploy@ALAMAT_SERVER:/var/www/profilindah.id/frontend/`

Menerbitkan versi berikutnya kelak tidak perlu diketik ulang — ada skrip
yang menjalankan seluruh urutan ini dan berhenti pada kegagalan pertama:

```bash
/var/www/profilindah.id/backend/scripts/deploy-fe.sh
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
    root /var/www/profilindah.id/frontend;
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
cd /var/www/profilindah.id/backend && ./node_modules/.bin/prisma migrate deploy
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

## Bagian 9b — Menerbitkan versi berikutnya

Setelah pemasangan pertama ini selesai, deploy berikutnya cukup dua perintah.
Keduanya berhenti pada kegagalan pertama — berbeda dari menempel serangkaian
perintah di terminal, yang tetap melanjutkan sisanya setelah satu langkah
gagal dan menerbitkan kode lama tanpa memberi tahu siapa pun.

```bash
/var/www/profilindah.id/backend/scripts/deploy.sh
```

```bash
/var/www/profilindah.id/backend/scripts/deploy-fe.sh
```

`deploy.sh` menarik perubahan, menyelaraskan paket, menghasilkan klien
Prisma, membangun, menjalankan pemeriksaan statis dan uji, menerapkan
migrasi, lalu menyalakan ulang **kedua** layanan dan memastikan keduanya
menjawab. `deploy-fe.sh` membangun frontend, memeriksa hasilnya memuat
`index.html` dan berkas terjemahan, baru menyalinnya.

Pilihan yang berguna:

| Perintah | Kegunaan |
|---|---|
| `deploy.sh --periksa` | menguji kesiapan tanpa menyentuh basis data maupun layanan |
| `deploy.sh --lewati-uji` | melewati jajaran uji ketika sedang terburu-buru |
| `deploy-fe.sh --lewati-tarik` | membangun ulang tanpa menarik perubahan |

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
