const { Spotify: SoundloadersScraper } = require('../lib/resapi')

let handler = async (m, { conn, text, usedPrefix, command }) => {
  // 1. Validasi Input Kosong
  if (!text) {
    throw `✳️ Masukkan link Spotify yang ingin diunduh!\n\n📌 *Contoh:*\n${usedPrefix + command} https://open.spotify.com/track/6TqtFqq6QgYhQVCM87GKVF`
  }

  // 2. Validasi URL Spotify (Memastikan user memasukkan link track yang benar)
  const isSpotifyUrl = /spotify\.com\/track\//i.test(text)
  if (!isSpotifyUrl) {
    throw `⚠️ Link tidak valid! Pastikan kamu memasukkan link *Track* Spotify, bukan playlist atau album.`
  }

  // Pesan loading
  const processing = await conn.reply(m.chat, '⏳ Sedang memproses dan mengunduh lagu...', m)

  try {
    // 3. Request menggunakan lib/spotify.js
    const scraper = new SoundloadersScraper()
    const result = await scraper.download(text)

    // 4. Validasi respon dari scraper
    if (!result.status) {
      throw new Error(result.message || 'Lagu tidak ditemukan atau gagal diunduh.')
    }

    // Ekstrak data dari JSON (menyesuaikan format output lib/spotify.js)
    const { title, artist, cover_url, download_url } = result.data

    // 5. Susun teks caption untuk cover lagu
    let caption = `🎧 *SPOTIFY DOWNLOADER* 🎧\n\n`
    caption += `🎵 *Judul:* ${title}\n`
    caption += `👤 *Artis:* ${artist}\n\n`
    caption += `_Audio sedang dikirim, mohon tunggu sebentar..._`

    // 6. Kirim Cover (Gambar) beserta informasi lagu
    // Fallback image jika cover_url null dari scraper
    const coverImage = cover_url ? { url: cover_url } : { url: 'https://files.catbox.moe/kxl801.jpg' } 
    
    await conn.sendMessage(m.chat, {
      image: coverImage,
      caption: caption
    }, { quoted: m })

    // 7. Kirim Audio (.mp3)
    await conn.sendMessage(m.chat, {
      audio: { url: download_url },
      mimetype: 'audio/mpeg',
      ptt: false, // Set 'true' jika ingin dikirim sebagai Voice Note (VN)
      fileName: `${title} - ${artist}.mp3` // Nama file ketika diunduh
    }, { quoted: m })

    // 8. Update pesan loading menjadi sukses
    await conn.sendMessage(m.chat, { 
      text: '✅ Lagu berhasil diunduh dan dikirim!', 
      edit: processing.key 
    })

  } catch (err) {
    console.error(err)
    // Update pesan loading jika terjadi error
    await conn.sendMessage(m.chat, { 
      text: `❌ Gagal mengunduh lagu:\n\nDetail: ${err.message}`, 
      edit: processing.key 
    })
  }
}

handler.help = ['spotify <link>']
handler.tags = ['downloader']
handler.command = ['spotify2', 'sp']
handler.limit = true
handler.register = true

module.exports = handler