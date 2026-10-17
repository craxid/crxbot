# Akebi Bot - WhatsApp Bot

**Versi 10.0.19**

<p>
  <a href="https://github.com/craxid/crxbot/stargazers"><img src="https://img.shields.io/github/stars/craxid/crxbot?style=flat-square" alt="Stars"></a>
  <a href="https://github.com/craxid/crxbot/network/members"><img src="https://img.shields.io/github/forks/craxid/crxbot?style=flat-square" alt="Forks"></a>
  <a href="https://github.com/craxid/crxbot/watchers"><img src="https://img.shields.io/github/watchers/craxid/crxbot?style=flat-square" alt="Watchers"></a>
  <a href="https://github.com/craxid/crxbot/commits/main"><img src="https://img.shields.io/github/last-commit/craxid/crxbot?style=flat-square" alt="Last commit"></a>
  <a href="https://github.com/craxid/crxbot"><img src="https://img.shields.io/github/repo-size/craxid/crxbot?style=flat-square" alt="Repo size"></a>
  <a href="https://github.com/craxid/crxbot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/craxid/crxbot?style=flat-square" alt="License"></a>
</p>

Bot WhatsApp multifungsi berbasis [Baileys](https://github.com/WhiskeySockets/Baileys) dengan 450+ perintah. Login memakai pairing code (tanpa scan QR), mendukung dijalankan di VPS, Panel Pterodactyl, maupun Termux.

## Fitur

### Downloader
- TikTok, Douyin, Spotify, SafeLinkU via [CraXID Scraper API](https://api.hxa.my.id/docs) (bisa dioverride dengan env `RESAPI_URL`)
- Facebook, Instagram via API Siputzx
- YouTube audio/video, SoundCloud, Pinterest
- Mediafire, Google Drive, Capcut

### Tools
- Shortlink: Bitly, TinyURL, Cuttly, s.id, SafeLinkU
- Screenshot web, QR generator/reader
- Translate, kalkulator, cuaca, jadwal sholat
- Cek resi J&T Express

### Stiker & Media
- Buat stiker dari foto/video/teks
- Stiker meme, emoji mix
- Ubah format audio/video (butuh ffmpeg)

### Game & RPG
- RPG lengkap: berburu, mancing, mining, duel, rampok
- Tebak-tebakan: asah otak, tebak gambar, susun kata, tebak lagu
- Slot, judi, suit PvP

### AI
- Chat AI (beberapa provider)
- Text-to-image, image-to-text
- Transkripsi voice note

### Grup
- Antilink (link grup, link channel, virtex)
- Antibadword teks + voice note (transkripsi lokal)
- Welcome/goodbye, promote/demote, kick/add
- Absen, voting, afk

### Owner
- Broadcast, save/sender status WA (.upsw)
- Sistem redeem kode (.setredeem, .redeem)
- Restart, update, exec via chat

Ketik `.menu` di chat bot untuk daftar lengkap, atau `.menu <kategori>` untuk filter (contoh: `.menu downloader`).

## Persiapan

1. **Node.js 20+** wajib terinstal
2. **ffmpeg** wajib untuk fitur stiker/media
3. Isi `config.js`:
   - `global.owner`: nomor WhatsApp kamu diawali kode negara tanpa `+` (contoh: `6281234567890`)
   - API key: daftar gratis di tiap penyedia, lalu tempel di `config.js` (bitly, tinyurl, cuttly, s.id, dll). Tanpa API key, fitur terkait tidak jalan.
4. Jalankan `node index.js`, lalu masukkan **pairing code** yang muncul di terminal ke WhatsApp: Pengaturan > Perangkat Tertaut > Tautkan Perangkat > Tautkan dengan nomor telepon.

## Instalasi VPS (Ubuntu/Debian)

```bash
# Update sistem & instal dependensi
apt update && apt upgrade -y
apt install -y git ffmpeg imagemagick

# Instal Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node -v  # pastikan v20+

# Clone & instal
git clone https://github.com/craxid/crxbot.git
cd crxbot
npm install

# Isi config.js (owner & API key), lalu jalankan
node index.js
```

### Menjaga bot tetap hidup dengan PM2

```bash
npm install -g pm2
pm2 start index.js --name bot -- --autocleartmp --autoread
pm2 save
pm2 startup  # ikuti instruksi yang muncul agar hidup setelah reboot
```

Perintah berguna: `pm2 logs bot`, `pm2 restart bot`, `pm2 stop bot`.

## Instalasi Panel Pterodactyl

1. Buat server baru dengan egg **Node.js**
2. Startup command: `node index.js --autocleartmp --autoread`
3. Upload/clone source ke file manager panel, lalu buka console dan jalankan `npm install`
4. Edit `config.js` lewat file manager (isi owner & API key)
5. Start server, masukkan pairing code dari console ke WhatsApp

Catatan: egg Node.js standar tidak menyertakan ffmpeg. Fitur stiker dari video dan konversi media tidak akan jalan kecuali image Docker diganti yang menyertakan ffmpeg, atau minta admin panel menginstalkannya.

## Instalasi Termux (Android)

```bash
# Update & instal dependensi
pkg update && pkg upgrade -y
pkg install -y git nodejs ffmpeg imagemagick python

# Cek versi Node
node -v  # pastikan v20+

# Clone & instal
git clone https://github.com/craxid/crxbot.git
cd crxbot
npm install

# Isi config.js (owner & API key), lalu jalankan
node index.js
```

Tips Termux:
- Jalankan di sesi `tmux` agar bot tetap hidup saat Termux diminimalkan: `pkg install tmux`, lalu `tmux new -s bot`, jalankan bot di dalamnya, detach dengan `Ctrl+B` lalu `D`.
- Jangan bersihkan storage Termux saat bot jalan, file sesi ada di folder `sessions/`.
- Baterai: matikan optimasi baterai untuk Termux agar proses tidak di-kill sistem.

## Argumen CLI

```
node index.js [opsi]
```

| Opsi | Fungsi |
|------|--------|
| `--self` | Mode self, hanya owner yang bisa pakai |
| `--pconly` | Hanya respon di chat pribadi |
| `--gconly` | Hanya respon di grup |
| `--swonly` | Hanya respon status |
| `--autoread` | Tandai semua pesan masuk sebagai dibaca |
| `--autocleartmp` | Bersihkan file sementara otomatis |
| `--prefix .` | Ganti prefix perintah |
| `--db <url>` | Pakai MongoDB sebagai database |
| `--restrict` | Aktifkan plugin berisiko (rawan banned) |
| `--server` | Mode server untuk hosting |

## Struktur Folder

```
crxbot/
├── config.js      # Konfigurasi: owner, API key, pesan bot
├── index.js       # Entry point
├── handler.js     # Penangan pesan & perintah
├── plugins/       # 450+ plugin perintah
├── lib/           # Library internal
├── media/         # Aset gambar/menu
├── sessions/      # Sesi login (jangan dihapus/commit)
└── database.json  # Database lokal (jangan di-commit)
```

## Catatan Keamanan

- Jangan pernah commit `sessions/`, `database.json`, `cookies.txt`, atau `config.js` yang sudah berisi API key asli ke repo publik.
- File `.gitignore` sudah disertakan untuk mencegah itu.
- Kalau API key tidak sengaja ter-publish, revoke dari dashboard penyedia masing-masing.

## Kredit

Library WA: [WhiskeySockets/Baileys](https://github.com/WhiskeySockets/Baileys)
