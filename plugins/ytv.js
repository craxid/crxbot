const search = require('yt-search')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const { exec } = require('child_process')

const FORMATS = {
  video: { "144p": 144, "240p": 240, "360p": 360, "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4k": "4k" },
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function validateFormat(type, format) {
  if (!FORMATS[type]) throw new Error(`Invalid type: ${type}`)
  const value = FORMATS[type][format]
  if (!value) throw new Error(`Invalid format: ${format}`)
  return value
}

const apiHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
}

async function getDownloadUrl(url, type = "video", format = "360p") {
  const formatValue = validateFormat(type, format)
  const start = await axios.get("https://p.savenow.to/ajax/download.php", {
    params: { copyright: 0, format: formatValue, url: url, api: "dfcb6d76f2f6a9894gjkege8a4ab232222" },
    headers: apiHeaders
  }).catch((err) => { throw new Error(`API Downloader mati: ${err.message}`) })

  const init = start.data
  if (!init || !init.progress_url) throw new Error("Savenow gagal memproses link tersebut.")

  const id = init.progress_url.split("id=")[1]
  let progressData
  let retries = 0
  const maxRetries = 15 

  while (retries < maxRetries) {
    const res = await axios.get("https://p.savenow.to/api/progress", { params: { id }, headers: apiHeaders }).catch(() => {})
    const data = res?.data
    if (data && data.success === 1 && data.progress === 1000) {
      progressData = data
      break
    }
    retries++
    await sleep(1000)
  }

  if (!progressData || !progressData.download_url) throw new Error("Proses rendering Savenow terlalu lama.")
  return progressData.download_url
}

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) throw `✳️ Masukkan judul atau link YouTube\n\n📌 Contoh:\n${usedPrefix + command} lathi`

  const tmpDir = path.join(process.cwd(), 'tmp')
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true }) 
  
  const rawPath = path.join(tmpDir, `raw_${Date.now()}.mp4`)
  const finalPath = path.join(tmpDir, `fixed_${Date.now()}.mp4`)

  // --- LANGKAH 1: Kirim Pesan Pertama & Simpan KEY-nya ---
  let msg = await conn.sendMessage(m.chat, { text: '🔍 Mencari metadata...' }, { quoted: m })

  try {
    const look = await search(text)
    const videoData = look.videos[0]
    
    if (!videoData) throw 'Video Tidak Ditemukan.'

    // --- LANGKAH 2: Edit Pesan Pertama (Menyiapkan) ---
    await conn.sendMessage(m.chat, { text: `⏳ Menyiapkan: *${videoData.title}*...`, edit: msg.key })
    
    const downloadUrl = await getDownloadUrl(videoData.url, "video", "360p")

    // --- LANGKAH 3: Edit Pesan (Mendownload) ---
    await conn.sendMessage(m.chat, { text: `⬇️ Sedang mendownload dari server...`, edit: msg.key })

    // Download ke file RAW
    const response = await axios({ url: downloadUrl, method: 'GET', responseType: 'stream', headers: apiHeaders })
    const writer = fs.createWriteStream(rawPath)
    response.data.pipe(writer)

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })

    // --- LANGKAH 4: Edit Pesan (Memperbaiki Format via FFmpeg) ---
    await conn.sendMessage(m.chat, { text: `⚙️ Sedang memperbaiki format video...`, edit: msg.key })
    await new Promise((resolve, reject) => {
      exec(`ffmpeg -i "${rawPath}" -c:v libx264 -preset veryfast -crf 28 -c:a aac -b:a 128k -y "${finalPath}"`, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })

    const views = videoData.views ? videoData.views.toLocaleString('id-ID') : 'Tidak diketahui'
    const caption = `🎬 *YOUTUBE DOWNLOADER* 🎬\n\n`
      + `📌 *Judul:* ${videoData.title}\n`
      + `👤 *Channel:* ${videoData.author.name}\n`
      + `⏱️ *Durasi:* ${videoData.timestamp}\n`
      + `👁️ *Ditonton:* ${views} kali\n`
      + `📅 *Diunggah:* ${videoData.ago}\n`
      + `🔗 *Link:* ${videoData.url}`

    // --- LANGKAH 5: Edit Pesan (Mengirim ke Chat) ---
    await conn.sendMessage(m.chat, { text: `📤 Sedang mengirim video ke chat Anda...`, edit: msg.key })
    
    await conn.sendMessage(m.chat, {
      video: fs.readFileSync(finalPath), 
      caption: caption,
      mimetype: 'video/mp4'
    }, { quoted: m })

    // --- LANGKAH TERAKHIR: Edit Status Menjadi Selesai ---
    await conn.sendMessage(m.chat, { text: `✅ Berhasil dikirim!`, edit: msg.key })

  } catch (err) {
    console.error(err)
    // Jika gagal, edit pesan tadi menjadi pemberitahuan error
    if (msg && msg.key) {
      await conn.sendMessage(m.chat, { text: `❌ Gagal:\n${err.message || err}`, edit: msg.key })
    } else {
      m.reply(`❌ Gagal:\n${err.message || err}`)
    }
  } finally {
    // Bersihkan kedua file
    if (fs.existsSync(rawPath)) {
        try { fs.unlinkSync(rawPath) } catch (e) {}
    }
    if (fs.existsSync(finalPath)) {
        try { fs.unlinkSync(finalPath) } catch (e) {}
    }
  }
}

handler.command = ['ytv', 'ytmp4']
handler.help = ['ytv']
handler.tags = ['tools']
handler.register = true
handler.limit = true
module.exports = handler