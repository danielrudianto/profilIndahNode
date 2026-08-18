# Sandbox — VM sendiri, uji versi baru tanpa menyentuh produksi

Tujuan: menjalankan backend + frontend versi baru di
`https://sandbox.profilindah.id` pada **VM terpisah** di atas SALINAN
data produksi. `environment.ts` frontend sudah menunjuk domain ini,
dan CORS backend sudah mengizinkannya. Karena mesinnya sendiri, semua
layanan memakai port bawaan — tidak ada instance kedua-keduaan, dan
sandbox yang dihajar seberat apa pun tidak menyentuh produksi.

## 0. Spesifikasi VM

Terukur dari data nyata: basis data salinan ±1,1 GB, indeks
Meilisearch belasan MB, backend + worker ±300 MB RAM.

- **RAM 2 GB, 1–2 vCPU, disk 25 GB** — tier murah mana pun cukup.
- Build Angular butuh ±2 GB sendiri; **build frontend di laptop lalu
  unggah `dist/`-nya** (langkah 4), atau tambahkan swap 2 GB bila mau
  build di VM.
- Ubuntu LTS; instal: `mysql-server`, `redis-server`, `nginx`,
  `certbot`, Node LTS, dan binary `meilisearch`.

Arahkan DNS `sandbox.profilindah.id` (A record) ke IP VM, lalu
`certbot --nginx` untuk TLS-nya.

## 1. Salin basis data

Pindahkan dump langsung antar server milik sendiri (scp/rsync — jangan
lewat layanan pihak ketiga mana pun; isinya data bisnis nyata):

```bash
scp /path/ke/dump-produksi.sql daniel@ip-vm-sandbox:/home/daniel/
```

Di VM sandbox:

```bash
mysql -u root -p -e "CREATE DATABASE profil_indah_sandbox"
```

```bash
mysql -u root -p profil_indah_sandbox < /home/daniel/dump-produksi.sql
```

Buat user MySQL khusus aplikasi (bukan root):

```bash
mysql -u root -p -e "CREATE USER 'sandbox'@'localhost' IDENTIFIED BY 'GANTI-SANDI-INI'; GRANT ALL ON profil_indah_sandbox.* TO 'sandbox'@'localhost';"
```

## 2. Layanan pendamping

Redis bawaan (port 6379) langsung pakai. Meilisearch dengan master key
BARU (bukan milik produksi):

```bash
meilisearch --http-addr 127.0.0.1:7700 --master-key "ISI-KUNCI-BARU" --db-path /var/lib/meili-sandbox
```

Jadikan service (systemd) supaya hidup lagi setelah reboot.

## 3. Backend

Clone repo, checkout branch `beres-migrasi-dan-bersih-bersih`, lalu:

```bash
npm install
```

Buat `.env`:

```
DATABASE_URL="mysql://sandbox:GANTI-SANDI-INI@localhost:3306/profil_indah_sandbox"
PORT="5000"
TOKEN_KEY="kunci-baru-khusus-sandbox"
REFRESH_TOKEN_KEY="kunci-baru-khusus-sandbox-juga"
EXPIRATION="1h"
REFRESH_EXPIRATION="7d"
MEILISEARCH_HOST="http://127.0.0.1:7700"
MEILISEARCH_MASTER_KEY="ISI-KUNCI-BARU"
REDIS_URL="redis://localhost:6379"
REDIS_HOST="localhost"
REDIS_PORT="6379"
LIMIT="10"
```

Migrasi + klien Prisma:

```bash
npx prisma migrate deploy && npx prisma generate
```

Indeks tuning (BAGIAN 1–6, semuanya `ALGORITHM=INPLACE, LOCK=NONE`) —
jalankan bagian demi bagian dari `docs/index-tuning.sql` pada
`profil_indah_sandbox`.

Indeks pencarian + data turunan:

```bash
npm run start:setup
```

```bash
npm run start:sync-product
```

```bash
npm run start:sync-package
```

```bash
npm run start:settle-receivables
```

Disarankan — supaya sandbox memperlihatkan HPP #4 (alokasi diskon
faktur) pada sejarah; di VM sendiri boleh kapan saja:

```bash
npm run start:rebuild-stock-in
```

Nyalakan aplikasi + worker (pm2/systemd):

```bash
npm run build && node dist/app.js
```

```bash
node dist/worker.js
```

## 4. Frontend

Di laptop (branch `upgrade-angular-20`):

```bash
npm install && npx ng build
```

`environment.ts` sudah menunjuk `https://sandbox.profilindah.id/` —
tidak ada yang perlu diubah. Unggah hasilnya:

```bash
rsync -a dist/profil-indah-16/browser/ daniel@ip-vm-sandbox:/var/www/sandbox/
```

Blok nginx (API satu origin, di-proxy ke port 5000):

```
server {
  server_name sandbox.profilindah.id;
  root /var/www/sandbox;
  location / { try_files $uri $uri/ /index.html; }
  location ~ ^/(auth|product|report|sales-invoice|good-receipt|customer|supplier|receivable|overpayment|expense|dashboard|deposit|sales-return|adjustment-case|promotion|salesman|company|payment-method|expense-type|user|user-avatar|product-brand|product-type|product-stock|product-package|product-price-sales|product-price-purchase|cashier|audit-logs|changelog|os|warehouse|sales-deposit) {
    proxy_pass http://127.0.0.1:5000;
  }
}
```

## 5. Uji cepat setelah nyala

- Masuk dengan akun dari data salinan; ganti bahasa dan mode gelap.
- Buka laporan penjualan, pembelian, keuangan, persediaan, uang masuk —
  grafik bertooltip dan sorotan harus tampil.
- Buat faktur penjualan percobaan (bebas — ini sandbox), lihat
  peringatan stok minus, lalu hapus fakturnya.
- Cek daftar barang & stok (memastikan Meilisearch tersinkron).

Rusak? Restore ulang dump-nya — itulah gunanya sandbox. Mau segar
lagi? Ambil dump produksi terbaru dan ulangi langkah 1.
