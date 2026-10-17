const axios = require('axios')
const FormData = require('form-data')
const crypto = require('crypto')

/**
 * Konfigurasi
 */
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const POLL_INTERVAL_MS = 5000
const MAX_POLL = 100 // Ditambah karena proses video AI cukup lama
const AXIOS_TIMEOUT = 300000 // 5 menit

axios.defaults.timeout = AXIOS_TIMEOUT

/**
 * Helper membuat header standar
 */
const makeHeaders = (serial, extra = {}) => Object.assign({
  'accept': '*/*',
  'product-serial': serial,
  'user-agent': UA,
  'Referer': 'https://unblurimage.ai/'
}, extra)

/**
 * Upload step 1: register upload
 */
async function registerUpload(serial, fileName) {
  const form = new FormData()
  form.append('video_file_name', fileName)

  const res = await axios.post(
    'https://api.unblurimage.ai/api/upscaler/v1/ai-video-enhancer/upload-video',
    form,
    { headers: makeHeaders(serial, form.getHeaders()) }
  )

  if (!res?.data?.result) throw new Error('Register upload gagal')
  return res.data.result 
}

/**
 * Upload step 2: PUT file ke OSS
 */
async function uploadToOss(ossUrl, buffer) {
  await axios.put(ossUrl, buffer, {
    headers: { 'Content-Type': 'video/mp4', 'User-Agent': UA },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  })
}

/**
 * Create job
 */
async function createJob(serial, objectName, resolution = '2k', isPreview = false) {
  const form = new FormData()
  form.append('original_video_file', `https://cdn.unblurimage.ai/${objectName}`)
  form.append('resolution', resolution)
  form.append('is_preview', isPreview ? 'true' : 'false')

  const res = await axios.post(
    'https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/create-job',
    form,
    { headers: makeHeaders(serial, form.getHeaders()) }
  )

  if (!res?.data?.result?.job_id) throw new Error('Gagal membuat job')
  return res.data.result.job_id
}

/**
 * Polling job until output_url tersedia
 */
async function pollJob(serial, jobId, intervalMs = POLL_INTERVAL_MS, maxAttempts = MAX_POLL) {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs))
    const res = await axios.get(
      `https://api.unblurimage.ai/api/upscaler/v2/ai-video-enhancer/get-job/${jobId}`,
      { headers: makeHeaders(serial) }
    )
    const output = res?.data?.result?.output_url
    const status = res?.data?.result?.status 
    
    if (output) return output
    if (status === 'failed') throw new Error('Server AI gagal memproses video.')
  }
  throw new Error('Timeout: Proses AI terlalu lama.')
}

/**
 * Fungsi utama Enhancement
 */
async function enhanceBufferVideo(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Input bukan buffer')

  const serial = crypto.createHash('md5').update(UA + Date.now()).digest('hex')
  const fileName = crypto.randomBytes(3).toString('hex') + '_video.mp4'

  const reg = await registerUpload(serial, fileName)
  const { url: ossUrl, object_name: objectName } = reg
  if (!ossUrl || !objectName) throw new Error('Response register tidak lengkap')

  await uploadToOss(ossUrl, buffer)
  const jobId = await createJob(serial, objectName, '2k', false)
  const outputUrl = await pollJob(serial, jobId)
  return outputUrl
}

/**
 * Handler bot
 */
let handler = async (m, { conn, usedPrefix, command }) => {
  const q = m.quoted ? m.quoted : m
  const mime = (q.msg || q).mimetype || q.mimetype || ''
  const isVideo = /^video\//.test(mime)

  if (!isVideo) throw `Kirim atau balas video dengan caption *${usedPrefix + command}*`

  // 1. Reaksi & Pesan Loading
  await conn.sendMessage(m.chat, { react: { text: '⏳', key: m.key }})
  const processingMsg = await conn.reply(m.chat, '⏳ *AI sedang bekerja...*\nVideo sedang di-upscale ke 2K. Proses ini memakan waktu 1-5 menit tergantung durasi video.', m)

  try {
    const media = await q.download()
    if (!Buffer.isBuffer(media)) throw new Error('Gagal mengunduh video.')

    // Batasi ukuran input (Contoh 30MB agar tidak overload)
    if (media.length > 30 * 1024 * 1024) throw new Error('Video terlalu besar. Maksimal 30MB.')

    // 2. Jalankan Proses AI
    const outputUrl = await enhanceBufferVideo(media)

    // 3. Kirim Hasil Berupa File Video
    await conn.sendMessage(m.chat, { 
      video: { url: outputUrl }, 
      caption: `✅ *AI Video Enhance Selesai!*\n\n*Target:* 2K Resolution\n*Note:* Kualitas tergantung pada video asli.`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    // 4. Beri Reaksi Sukses & Hapus Pesan Loading
    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key }})
    await conn.sendMessage(m.chat, { delete: processingMsg.key })

  } catch (err) {
    console.error('Error:', err)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key }})
    
    // Kirim pesan error dan hapus loading
    await conn.sendMessage(m.chat, {
      text: `❌ *Gagal memproses video*\n\n*Pesan:* ${err.message || 'Terjadi kesalahan sistem'}`
    }, { quoted: m })
    await conn.sendMessage(m.chat, { delete: processingMsg.key })
  }
}

handler.command = handler.help = ['hdvideo', 'hdrvideo','hdvid']
handler.tags = ['tools']
handler.limit = 1
handler.register = true
handler.premium = true

module.exports = handler
