#!/usr/bin/env bash
#
# Deploy Profil Indah V20 — frontend.
#
# Membangun dari sumber lalu menyalin hasilnya ke folder yang disajikan
# nginx. Berhenti pada kegagalan pertama, dan MEMERIKSA hasil build sebelum
# menyalin — build Angular dapat "berhasil" tanpa menyalin berkas yang
# diperlukan, dan itu baru terasa ketika halamannya dibuka.
#
# Pemakaian:
#   ./scripts/deploy-fe.sh                 # tarik, pasang, bangun, salin
#   ./scripts/deploy-fe.sh --lewati-tarik
#
# Tinggal di repositori BACKEND meski mengurus frontend, karena dua alasan:
# ia menyentuh dua folder sekaligus sehingga bukan milik salah satunya, dan
# skrip yang menarik repositorinya sendiri berisiko berubah isi saat sedang
# dijalankan bash.

set -euo pipefail

SUMBER="${SUMBER_FRONTEND:-/var/www/profilindah.id/frontend-src}"
TUJUAN="${TUJUAN_FRONTEND:-/var/www/profilindah.id/frontend}"
PROYEK="profil-indah-16"
DOMAIN="${DOMAIN_FRONTEND:-v20.profilindah.id}"

merah()  { printf '\033[31m%s\033[0m\n' "$*"; }
hijau()  { printf '\033[32m%s\033[0m\n' "$*"; }
kuning() { printf '\033[33m%s\033[0m\n' "$*"; }

gagal() {
  merah "GAGAL: $*"
  exit 1
}

LEWATI_TARIK=0
[[ "${1:-}" == "--lewati-tarik" ]] && LEWATI_TARIK=1

cd "$SUMBER" || gagal "folder sumber tidak ada: $SUMBER"

# ---------------------------------------------------------------------
# 1. Tarik perubahan
# ---------------------------------------------------------------------
if [[ $LEWATI_TARIK -eq 0 ]]; then
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
    gagal "bereskan dulu"
  fi

  SEBELUM="$(git rev-parse HEAD)"
  git pull --ff-only || gagal "git pull ditolak; jalankan 'git pull --rebase'"
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
echo "==> Menyelaraskan paket"

# `npm ci` menolak bila package-lock.json tidak sejalan dengan package.json —
# dan itu justru yang diinginkan di server.
#
# `node_modules` dibuang lebih dulu bila pemasangan pernah terputus: sisanya
# berupa folder setengah jadi, dan gejalanya ENOTEMPTY yang tidak menyebut
# sebabnya.
if ! npm ci --silent; then
  kuning "    npm ci gagal — membersihkan node_modules dan mengulang"
  rm -rf node_modules
  npm ci --silent || gagal "npm ci"
fi

# ---------------------------------------------------------------------
# 3. Bangun
# ---------------------------------------------------------------------
echo "==> Membangun (perlu beberapa menit)"

# Build Angular memerlukan memori besar, sering di atas 2 GB. Pada server
# kecil, yang dibunuh sistem saat kehabisan memori sering justru MySQL —
# bukan proses build-nya. Peringatan ini muncul sebelum hal itu terjadi.
TERSEDIA_MB="$(free -m | awk '/^Mem:/ {print $7}')"
if [[ "${TERSEDIA_MB:-0}" -lt 2048 ]]; then
  kuning "    memori tersedia hanya ${TERSEDIA_MB} MB; build dapat terhenti"
  kuning "    pertimbangkan menambah swap, atau bangun di mesin lain"
fi

npm run build || gagal "build"

HASIL="$SUMBER/dist/$PROYEK/browser"
[[ -d "$HASIL" ]] || gagal "folder hasil tidak ada: $HASIL"

# ---------------------------------------------------------------------
# 4. Periksa hasil SEBELUM menyalin
# ---------------------------------------------------------------------
# Entri `assets` yang tidak menemukan berkasnya TIDAK menggagalkan build —
# Angular hanya tidak menyalin apa pun.
#
# Berkas terjemahan adalah contoh terburuknya: aplikasinya tetap terbuka,
# tetapi setiap tulisan berubah menjadi kunci mentah seperti
# "stock-check__title" di seluruh layar.
echo "==> Memeriksa hasil build"

WAJIB=(
  "index.html"
  "assets/i18n/id.json"
  "assets/i18n/en.json"
  # Ditulis skrip postbuild. Tanpa berkas ini nomor versi di kaki menu profil
  # menghilang tanpa gejala lain — dan bersamanya ajakan muat ulang yang
  # memberi tahu orang bahwa ada rilis baru.
  "assets/version.json"
)
for berkas in "${WAJIB[@]}"; do
  [[ -f "$HASIL/$berkas" ]] || gagal "hasil build tidak memuat $berkas"
  echo "    ada: $berkas"
done

# Alamat API ikut terpanggang ke dalam berkas terbitan. Terbitan yang masih
# menunjuk sandbox tampak sehat sampai seseorang mencoba masuk.
if grep -rqs "sandbox.profilindah.id" "$HASIL"; then
  gagal "hasil build masih menunjuk sandbox — periksa src/environments/environment.ts"
fi

# ---------------------------------------------------------------------
# 5. Salin
# ---------------------------------------------------------------------
echo "==> Menyalin ke $TUJUAN"
mkdir -p "$TUJUAN"

# `--delete` membuang berkas lama yang sudah tidak dihasilkan lagi. Tanpa
# itu, potongan bernama-hash dari build lama menumpuk selamanya.
if command -v rsync > /dev/null; then
  rsync -a --delete "$HASIL/" "$TUJUAN/"
else
  rm -rf "${TUJUAN:?}/"*
  cp -r "$HASIL/." "$TUJUAN/"
fi

[[ -f "$TUJUAN/index.html" ]] || gagal "penyalinan tidak menghasilkan index.html"

# ---------------------------------------------------------------------
# 5b. Izin baca untuk nginx
# ---------------------------------------------------------------------
# nginx berjalan sebagai www-data dan hanya perlu MEMBACA. Tetapi berkas
# hasil salinan mewarisi umask pemanggilnya — dan ketika skrip ini
# dijalankan dengan sudo, umask root menghasilkan berkas yang hanya bisa
# dibaca pemiliknya.
#
# Gejalanya bukan "403 Forbidden" yang jelas, melainkan 500: try_files
# jatuh ke /index.html yang juga tidak terbaca, lalu berputar sampai nginx
# menyerah dengan "rewrite or internal redirection cycle". Sebabnya sama
# sekali tidak terbaca dari halaman yang dilihat pengguna.
#
# Folder induknya butuh izin telusur, bukan baca: tanpa +x di situ,
# www-data tidak bisa masuk meski isinya sudah bisa dibaca.
chmod -R a+rX "$TUJUAN"
chmod o+x "$(dirname "$TUJUAN")"

# ---------------------------------------------------------------------
# 6. Uji hidup
# ---------------------------------------------------------------------
# Diuji dengan NAMA DOMAINnya, bukan 127.0.0.1.
#
# Nginx melayani lebih dari satu domain dari mesin yang sama, dan permintaan
# tanpa `Host` yang cocok jatuh ke blok server pertama — yang belum tentu
# frontend ini. Pemeriksaan tanpa domain karena itu melaporkan 404 pada
# deploy yang sebenarnya berhasil, dan peringatan yang keliru membuat
# peringatan berikutnya ikut diabaikan.
if curl -fsS --max-time 10 -o /dev/null "https://${DOMAIN}/"; then
  hijau "Frontend tersaji di https://${DOMAIN}"
else
  kuning "Berkas tersalin, tetapi https://${DOMAIN} tidak menjawab."
  kuning "Periksa: sudo nginx -t && sudo systemctl status nginx"
fi

hijau "Selesai."
echo
echo "Bila tampilannya tidak berubah di peramban, tekan Ctrl+Shift+R sekali."
