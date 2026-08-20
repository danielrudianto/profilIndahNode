#!/usr/bin/env bash
#
# Deploy Profil Indah V20 — backend.
#
# Menggantikan urutan yang selama ini diketik tangan:
#
#   git pull && npm ci && prisma generate && prisma migrate deploy
#            && npm run build && systemctl restart api worker
#
# Bedanya bukan sekadar lebih singkat. Skrip ini BERHENTI pada kegagalan
# pertama. Menempel beberapa perintah sekaligus di terminal tidak melakukan
# itu — bila `git pull` gagal, sisanya tetap berjalan dan yang ter-deploy
# adalah kode lama.
#
# Pemakaian:
#   ./scripts/deploy.sh                 # tarik, pasang, migrasi, bangun, nyalakan ulang
#   ./scripts/deploy.sh --periksa       # hanya periksa; tidak menyentuh basis data maupun layanan
#   ./scripts/deploy.sh --lewati-uji    # tanpa menjalankan jajaran uji (lebih cepat)

set -euo pipefail

AKAR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$AKAR"

LAYANAN_API="profil-indah-api"
LAYANAN_WORKER="profil-indah-worker"

merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
kuning() { printf '\033[33m%s\033[0m\n' "$*"; }

gagal() {
  merah "GAGAL: $*"
  exit 1
}

HANYA_PERIKSA=0
LEWATI_UJI=0
for arg in "$@"; do
  case "$arg" in
    --periksa)    HANYA_PERIKSA=1 ;;
    --lewati-uji) LEWATI_UJI=1 ;;
    *)            gagal "pilihan tidak dikenal: $arg" ;;
  esac
done

# ---------------------------------------------------------------------
# 0. Prasyarat
# ---------------------------------------------------------------------
# Server produksi memakai satu berkas bernama `.env` saja. Mesin yang
# memisahkan dua lingkungan boleh memakai `.env.production`, tetapi Prisma CLI
# hanya mengenal nama `.env` — tanpa tautan ke sana, `migrate deploy` di bawah
# menembak basis data lain, padahal aplikasinya sendiri baik-baik saja.
[[ -e "$AKAR/.env" ]] || {
  if [[ -f "$AKAR/.env.production" ]]; then
    gagal ".env tidak ada; jalankan: ln -s .env.production .env"
  fi
  gagal "tidak ada berkas lingkungan (.env)"
}

# `sudo git` meninggalkan berkas milik root di dalam .git, dan perintah git
# berikutnya gagal dengan pesan yang tidak menyebut sebabnya.
[[ -w "$AKAR/.git" ]] || gagal ".git tidak dapat ditulis — jalankan: sudo chown -R \$USER:\$USER .git"

git rev-parse HEAD > /dev/null 2>&1 || gagal "bukan repo git yang berisi commit"

# ---------------------------------------------------------------------
# 1. Tarik perubahan
# ---------------------------------------------------------------------
SEBELUM="$(git rev-parse HEAD)"
SESUDAH="$SEBELUM"

if [[ $HANYA_PERIKSA -eq 0 ]]; then
  echo "==> Menarik perubahan"

  # `npm install` mengubah package-lock.json, dan itu menghentikan `git pull`
  # di tengah. Berkas itu selalu boleh dibuang di server: yang berlaku adalah
  # yang ada di repo.
  if ! git diff --quiet -- package-lock.json; then
    kuning "    package-lock.json berubah setempat — dikembalikan"
    git checkout -- package-lock.json
  fi

  if ! git diff --quiet; then
    kuning "    ada perubahan lokal lain:"
    git diff --name-only | sed 's/^/      /'
    gagal "bereskan dulu — 'git checkout -- <berkas>' atau commit"
  fi

  git pull --ff-only || gagal "git pull ditolak; jalankan 'git pull --rebase' lalu ulangi"
  SESUDAH="$(git rev-parse HEAD)"

  if [[ "$SEBELUM" == "$SESUDAH" ]]; then
    echo "    tidak ada perubahan baru"
  else
    git --no-pager log --oneline "$SEBELUM..$SESUDAH" | sed 's/^/      /'
  fi
fi

# ---------------------------------------------------------------------
# 2. Paket
# ---------------------------------------------------------------------
# `npm ci` menolak bila package-lock.json tidak sejalan dengan package.json —
# dan itu justru yang diinginkan di server: yang terpasang harus persis sama
# dengan yang diuji, bukan versi terbaru yang kebetulan cocok.
if [[ ! -d node_modules ]] || git diff --name-only "$SEBELUM" "$SESUDAH" | grep -q '^package-lock\.json$'; then
  echo "==> Menyelaraskan paket"
  if ! npm ci --silent; then
    kuning "    npm ci gagal — membersihkan node_modules dan mengulang"
    rm -rf node_modules
    npm ci --silent || gagal "npm ci"
  fi
fi

# ---------------------------------------------------------------------
# 3. Klien Prisma
# ---------------------------------------------------------------------
# Dijalankan setiap kali: klien yang dihasilkan tinggal di node_modules, jadi
# ia ikut terhapus pada pemasangan ulang dan tidak boleh diandalkan tetap ada.
#
# `./node_modules/.bin/prisma`, BUKAN `npx prisma`.
#
# Bila paketnya belum terpasang, `npx` tidak berhenti — ia mengunduh versi
# TERBARU dari registry dan menjalankannya. Proyek ini masih di Prisma 6,
# sementara Prisma 7 menolak `url = env("DATABASE_URL")` di dalam skema;
# galatnya menuding skema, padahal skemanya benar dan CLI-nya yang salah.
PRISMA="$AKAR/node_modules/.bin/prisma"
[[ -x "$PRISMA" ]] || gagal "prisma tidak terpasang — jalankan 'npm ci' lebih dulu"

echo "==> Menghasilkan klien Prisma"
"$PRISMA" generate > /dev/null || gagal "prisma generate"

# ---------------------------------------------------------------------
# 4. Bangun
# ---------------------------------------------------------------------
echo "==> Membangun"
npm run build > /dev/null || gagal "tsc — perbaiki galat tipe sebelum deploy"

[[ -f "$AKAR/dist/app.js" ]]    || gagal "hasil build tidak memuat dist/app.js"
[[ -f "$AKAR/dist/worker.js" ]] || gagal "hasil build tidak memuat dist/worker.js"

# ---------------------------------------------------------------------
# 5. Pemeriksaan statis dan uji
# ---------------------------------------------------------------------
# Penjaga rute dan penyisipan SQL — murah, dan yang dijaganya mahal.
echo "==> Pemeriksaan penjaga rute dan SQL"
npm run check || gagal "pemeriksaan statis"

if [[ $LEWATI_UJI -eq 0 && -d tests ]]; then
  echo "==> Menjalankan uji (beberapa menit)"
  npm test -- --silent > /dev/null || gagal "ada uji yang tidak lolos"
fi

if [[ $HANYA_PERIKSA -eq 1 ]]; then
  hijau "Pemeriksaan selesai; basis data dan layanan tidak disentuh."
  exit 0
fi

# ---------------------------------------------------------------------
# 6. Migrasi basis data
# ---------------------------------------------------------------------
# SEBELUM layanan dinyalakan ulang. Kode baru yang membaca kolom yang belum
# ada menghasilkan galat 500 yang tidak menyebut kolom mana — jauh lebih
# mahal dicari nanti daripada dicegah sekarang.
#
# `migrate deploy` hanya menerapkan migrasi yang belum pernah dijalankan,
# jadi aman dipanggil pada setiap deploy.
echo "==> Menerapkan migrasi"
"$PRISMA" migrate deploy || gagal "prisma migrate deploy"

# ---------------------------------------------------------------------
# 7. Nyalakan ulang
# ---------------------------------------------------------------------
# KEDUANYA, selalu. Worker memuat kode yang sama dengan API; menyalakan ulang
# API saja meninggalkan worker lama yang memproses antrean dengan aturan HPP
# dan stok minimum versi sebelumnya — tanpa satu pun tanda di layar.
for layanan in "$LAYANAN_API" "$LAYANAN_WORKER"; do
  echo "==> Menyalakan ulang $layanan"
  sudo systemctl restart "$layanan"
done

# Beri waktu menyala sebelum diperiksa; tanpa jeda, statusnya masih
# "activating" dan pemeriksaan di bawah selalu lolos.
sleep 3

for layanan in "$LAYANAN_API" "$LAYANAN_WORKER"; do
  sudo systemctl is-active --quiet "$layanan" || {
    merah "$layanan tidak menyala. Tiga puluh baris log terakhir:"
    sudo journalctl -u "$layanan" -n 30 --no-pager
    exit 1
  }
done

# ---------------------------------------------------------------------
# 8. Uji hidup
# ---------------------------------------------------------------------
# Layanan yang "active" belum tentu melayani. Yang menentukan adalah ia
# menjawab permintaan.
#
# Tanpa `-f`: aplikasi ini tidak punya endpoint kesehatan, dan akar alamatnya
# memang menjawab 404. Yang diperiksa adalah ADANYA jawaban HTTP — kode 000
# berarti sambungannya sendiri gagal.
PORTA="$(grep -E '^PORT=' .env 2>/dev/null | tail -1 | cut -d= -f2 | tr -d '"' || true)"
PORTA="${PORTA:-5000}"

KODE="$(curl -sS --max-time 10 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORTA}/" || echo 000)"
if [[ "$KODE" == "000" ]]; then
  merah "Layanan menyala tetapi tidak menjawab di porta ${PORTA}."
  sudo journalctl -u "$LAYANAN_API" -n 30 --no-pager
  exit 1
fi

hijau "Backend hidup di porta ${PORTA} (HTTP ${KODE})."
hijau "Selesai."
