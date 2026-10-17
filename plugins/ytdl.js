const search = require('yt-search')
const axios = require('axios')
const fs = require('fs')
const path = require('path')
const os = require('os')
const { exec } = require('child_process')
const util = require('util')

const execPromise = util.promisify(exec)

const FORMATS = {
  video: { "144p": 144, "240p": 240, "360p": 360, "480p": 480, "720p": 720, "1080p": 1080, "1440p": 1440, "4k": "4k" },
  audio: { mp3: "mp3", m4a: "m4a", aac: "aac", flac: "flac", opus: "opus", ogg: "ogg", wav: "wav", webm: "webm" },
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

function validateFormat(type, format) {
  if (!FORMATS[type]) throw new Error(`Invalid type: ${type}`)
  const value = FORMATS[type][format]
  if (!value) throw new Error(`Invalid format: ${format}`)
  return value
}

// User-Agent untuk bypass proteksi Savenow
const headers = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Referer": "https://savenow.to/"
}

// Fungsi Download Stream (Untuk menyimpan file sementara)
async function downloadFile(url, dest) {
  const writer = fs.createWriteStream(dest)
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers
  })
  response.data.pipe(writer)
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve)
    writer.on('error', reject)
  })
}

// Fungsi pengambil link dinamis
async function getDownloadUrl(url, type, format) {
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
  if (!text) throw `✳️ Masukkan opsi dan link/judul YouTube\n\n📌 Contoh:\n${usedPrefix + command} --audio lathi\n${usedPrefix + command} --video lathi`

  const isAudio = text.includes('--audio')
  const isVideo = text.includes('--video')

  if (!isAudio && !isVideo) {
    throw `❗ Sertakan opsi --audio atau --video\n\n📌 Contoh:\n${usedPrefix + command} --audio lathi\n${usedPrefix + command} --video lathi`
  }

  const query = text.replace('--audio', '').replace('--video', '').trim()
  if (!query) throw 'Link atau judulnya belum dimasukkan!'

  let inputPath = ''
  let outputPath = ''
  let statusKey; // Variabel penyimpan kunci pesan untuk fitur Edit

  try {
    const MAX_DURATION = 900 // 15 menit
    const MAX_SIZE_MB = isAudio ? 20 : 30 

    // [1] Kirim pesan pertama sekaligus menyimpan "key" pesan tersebut
    const statusMsg = await conn.sendMessage(m.chat, { text: '🔍 Mencari metadata...' }, { quoted: m })
    statusKey = statusMsg.key

    const look = await search(query)
    const videoData = look.videos[0]
    
    if (!videoData) throw `${isAudio ? 'Audio' : 'Video'} Tidak Ditemukan di YouTube.`

    const title = videoData.title
    const duration = videoData.timestamp
    const finalUrl = videoData.url

    // Cek Durasi Video/Audio
    if (videoData.seconds > MAX_DURATION) {
      throw `*Aduh, durasinya kepanjangan!*\n\n⏱️ Durasi: ${duration}\n⚠️ Batas maksimal: ${MAX_DURATION / 60} menit.`
    }

    // [2] Edit pesan
    await conn.sendMessage(m.chat, { text: `⏳ Menyiapkan ${isAudio ? 'MP3' : 'MP4'} dari: *${title}*...`, edit: statusKey })

    const reqType = isAudio ? "audio" : "video"
    const reqFormat = isAudio ? "mp3" : "360p"

    const downloadUrl = await getDownloadUrl(finalUrl, reqType, reqFormat)

    // Cek Ukuran File Asli
    const checkSize = await axios.head(downloadUrl, { headers }).catch(() => null)
    if (checkSize && checkSize.headers['content-length']) {
      const sizeMB = parseInt(checkSize.headers['content-length']) / (1024 * 1024)
      if (sizeMB > MAX_SIZE_MB) {
        throw `*Ukuran file terlalu besar!*\n\n🗂️ Ukuran: ${sizeMB.toFixed(2)} MB\n⚠️ Batas maksimal: ${MAX_SIZE_MB} MB.`
      }
    }

    const captionText = `🎬 *Judul:* ${title}\n⏱️ *Durasi:* ${duration}\n🔗 *Link:* ${finalUrl}`

    const tmpDir = os.tmpdir()
    const sessionId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
    inputPath = path.join(tmpDir, `in_${sessionId}.tmp`)
    outputPath = path.join(tmpDir, `out_${sessionId}.${isAudio ? 'mp3' : 'mp4'}`)

    // [3] Edit pesan saat download
    await conn.sendMessage(m.chat, { text: '⬇️ Mengunduh file dari server...', edit: statusKey })
    await downloadFile(downloadUrl, inputPath)

    // [4] Edit pesan saat proses memakan waktu FFmpeg
    await conn.sendMessage(m.chat, { text: '⚙️ Memproses file agar didukung oleh WhatsApp...', edit: statusKey })
    
    if (isVideo) {
      await execPromise(`ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -pix_fmt yuv420p -preset fast -y "${outputPath}"`)
    } else {
      await execPromise(`ffmpeg -i "${inputPath}" -c:a libmp3lame -b:a 128k -y "${outputPath}"`)
    }

    // [5] Edit pesan sebelum file dikirim
    await conn.sendMessage(m.chat, { text: '📤 Mengirim media ke chat...', edit: statusKey })
    
    if (isAudio) {
      await conn.reply(m.chat, `🎧 *YouTube Audio*\n\n${captionText}`, m)
      await conn.sendMessage(m.chat, {
        audio: fs.readFileSync(outputPath),
        mimetype: 'audio/mpeg',
        ptt: false
      }, { quoted: m })
    } else {
      await conn.sendMessage(m.chat, {
        video: fs.readFileSync(outputPath),
        caption: `🎬 *YouTube Video*\n\n${captionText}`,
        mimetype: 'video/mp4'
      }, { quoted: m })
    }

    // [6] Opsional: Edit pesan jadi sukses agar lebih rapi
    await conn.sendMessage(m.chat, { text: '✅ Berhasil mengirim file!', edit: statusKey })

  } catch (err) {
    console.error(err)
    // Tangkap error lalu edit pesannya (kalau key sudah terbuat) atau kirim pesan baru (kalau gagal dari awal)
    if (statusKey) {
      await conn.sendMessage(m.chat, { text: `❌ Gagal:\n${err.message || err}`, edit: statusKey })
    } else {
      m.reply(`❌ Gagal:\n${err.message || err}`)
    }
  } finally {
    try {
      if (inputPath && fs.existsSync(inputPath)) fs.unlinkSync(inputPath)
      if (outputPath && fs.existsSync(outputPath)) fs.unlinkSync(outputPath)
    } catch (cleanupErr) {
      console.error('Gagal menghapus cache:', cleanupErr)
    }
  }
}

handler.help = ['ytdl']
handler.tags = ['downloader']
handler.command = ['ytdl', 'yt', 'youtube']
handler.limit = true
handler.register = true

module.exports = handler