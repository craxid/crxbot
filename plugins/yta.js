const search = require('yt-search')
const axios = require('axios')

const FORMATS = {
  audio: { mp3: "mp3", m4a: "m4a", aac: "aac", flac: "flac", opus: "opus", ogg: "ogg", wav: "wav", webm: "webm" },
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function validateFormat(type, format) {
  if (!FORMATS[type]) throw new Error(`Invalid type: ${type}`)
  const value = FORMATS[type][format]
  if (!value) throw new Error(`Invalid format: ${format}`)
  return value
}

const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://savenow.to/"
}

async function getDownloadUrl(url, type = "audio", format = "mp3") {
  const formatValue = validateFormat(type, format)
  const start = await axios.get("https://p.savenow.to/ajax/download.php", {
    params: { copyright: 0, format: formatValue, url: url, api: "dfcb6d76f2f6a9894gjkege8a4ab232222" },
    headers: headers
  }).catch((err) => { throw new Error(`API Downloader mati: ${err.message}`) })

  const init = start.data
  if (!init || !init.progress_url) throw new Error("Savenow gagal memproses link tersebut.")

  const id = init.progress_url.split("id=")[1]
  let progressData
  let retries = 0
  const maxRetries = 15 

  while (retries < maxRetries) {
    const res = await axios.get("https://p.savenow.to/api/progress", { params: { id }, headers: headers }).catch(() => {})
    const data = res?.data
    if (data && data.success === 1 && data.progress === 1000) {
      progressData = data
      break
    }
    retries++
    await sleep(1000)
  }

  if (!progressData || !progressData.download_url) throw new Error("Proses rendering Savenow terlalu lama (Timeout).")
  return progressData.download_url
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `✳️ Masukkan judul atau link YouTube\n\n📌 Contoh:\n${usedPrefix + command} lathi`

  try {
    // --- PENGATURAN LIMIT ---
    const MAX_DURATION = 900 // 900 detik = 15 menit
    const MAX_SIZE_MB = 20   // Batas ukuran 20 MB
    // ------------------------

    await m.reply('🔍 Mencari metadata audio...')

    const look = await search(text)
    const videoData = look.videos[0]
    
    if (!videoData) throw 'Audio Tidak Ditemukan di YouTube.'

    const title = videoData.title
    const duration = videoData.timestamp
    const finalUrl = videoData.url

    // [LAPIS 1] Cek Durasi Video
    if (videoData.seconds > MAX_DURATION) {
      throw `*Aduh, durasinya kepanjangan!*\n\n⏱️ Durasi audio ini: ${duration}\n⚠️ Batas maksimal: ${MAX_DURATION / 60} menit.`
    }

    await m.reply(`⏳ Menyiapkan MP3 dari: *${title}*...`)

    const downloadUrl = await getDownloadUrl(finalUrl, "audio", "mp3")

    // [LAPIS 2] Cek Ukuran File tanpa perlu mendownloadnya
    const checkSize = await axios.head(downloadUrl, { headers }).catch(() => null)
    if (checkSize && checkSize.headers['content-length']) {
      const sizeMB = parseInt(checkSize.headers['content-length']) / (1024 * 1024)
      if (sizeMB > MAX_SIZE_MB) {
        throw `*Ukuran file terlalu besar!*\n\n🗂️ Ukuran audio: ${sizeMB.toFixed(2)} MB\n⚠️ Batas maksimal: ${MAX_SIZE_MB} MB.`
      }
    }

    const caption = `🎧 *YouTube Audio*\n\n🎬 *Judul:* ${title}\n⏱️ *Durasi:* ${duration}\n🔗 *Link:* ${finalUrl}`

    await conn.reply(m.chat, caption, m)
    await conn.sendMessage(m.chat, {
      audio: { url: downloadUrl },
      mimetype: 'audio/mpeg',
      ptt: false
    }, { quoted: m })

  } catch (err) {
    console.error(err)
    m.reply(`❌ Gagal:\n${err.message || err}`)
  }
}

handler.help = ['yta', 'ytmp3']
handler.tags = ['downloader']
handler.command = ['yta', 'ytmp3', 'ytaudio']
handler.limit = true
handler.register = true

module.exports = handler